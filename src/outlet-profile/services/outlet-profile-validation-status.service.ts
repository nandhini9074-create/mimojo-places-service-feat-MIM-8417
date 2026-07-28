import { HttpException, HttpStatus, Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { HttpStatusCode } from 'axios';
import { EnvKeysEnum } from 'config/env.enum';
import { IInternalApiConfig } from 'config/interface';
import { ConfigService } from '@nestjs/config';
import { DataOperationsProducer } from 'src/kafka-services/data-operations.producer';
import { MerchantService } from 'src/merchant/services/merchant.service';
import { Sequelize } from 'sequelize-typescript';
import { Transaction } from 'sequelize';
import { OutletProfileMetadata } from '../entities/outlet-profile.model';
import { UpdateOutletProfileStatusDto } from '../dtos/update-outlet-profile-status.dto';
import { OutletProfileStatusEnum } from '../enums/outlet-profile-enum';
import { OutletAddress } from 'src/outlet/models/outlet-address.model';
import { OutletAddressService } from 'src/outlet/services/outlet-address.service';
import { OutletGetService } from 'src/outlet/services/outlet-get.service';
import { MastercardSchemeServiceProxy } from 'src/outlet/proxies/mc-scheme-service.proxy';
import { SchemeServiceProxy } from 'src/outlet/proxies/scheme-service.proxy';
import { FinanceServiceProxy } from 'src/outlet/proxies/finance-service.proxy';
import { MoEngageProxy } from 'src/outlet/proxies/moengage.proxy';
import { SearchServiceProxy } from 'src/outlet/proxies/search-service.proxy';
import { validateOutletAddressOrThrow } from 'src/outlet/shared/outlet-address-validation.util';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

@Injectable()
export class OutletProfileValidationStatusService {
  private readonly FoodAndDrinkCategoryId: string;
  private readonly fbCategoryTypeIds: string[];
  private readonly mimojoProfileId: string;

  constructor(
    @InjectModel(OutletProfileMetadata) private readonly outletProfileModel: typeof OutletProfileMetadata,
    private readonly outletAddressService: OutletAddressService,
    @Inject(forwardRef(() => MerchantService))
    private readonly merchantService: MerchantService,
    private readonly schemeServiceProxy: SchemeServiceProxy,
    private readonly mastercardSchemeServiceProxy: MastercardSchemeServiceProxy,
    private readonly financeServiceProxy: FinanceServiceProxy,
    private readonly dataOperationsProducer: DataOperationsProducer,
    private readonly configService: ConfigService,
    private readonly searchServiceProxy: SearchServiceProxy,
    private readonly moEngageProxy: MoEngageProxy,
    private readonly outletGetService: OutletGetService,
    private readonly sequelize: Sequelize,
    private readonly logger: CustomPinoLogger
  ) {
    const { FB_CATEGORY_ID, CATEGORY_TYPES, MIMOJO_PROFILE_ID } =
      this.configService.get<IInternalApiConfig>('internal-apis');
    this.FoodAndDrinkCategoryId = FB_CATEGORY_ID;
    this.fbCategoryTypeIds = CATEGORY_TYPES?.split(',');
    this.mimojoProfileId = MIMOJO_PROFILE_ID;
  }

  async validateAndUpdateOutletProfileStatus(
    dto: UpdateOutletProfileStatusDto,
    token: Record<string, string>,
    userId: string,
    getOutletProfileDetails: (
      outletId: string,
      profileId: string,
      token: Record<string, string>
    ) => Promise<Record<string, unknown>>,
    validateProfile: (outletProfileDetails: Record<string, unknown>) => void,
    updateOutletProfileCountByMerchant: (merchantId: string, profileId: string, transaction?: Transaction) => Promise<void>
  ): Promise<OutletProfileMetadata> {
    return this.validateAndUpdateOutletProfileStatusInternal(
      dto,
      token,
      userId,
      getOutletProfileDetails,
      validateProfile,
      updateOutletProfileCountByMerchant
    );
  }

  private async validateAndUpdateOutletProfileStatusInternal(
    dto: UpdateOutletProfileStatusDto,
    token: Record<string, string>,
    userId: string,
    getOutletProfileDetails: (
      outletId: string,
      profileId: string,
      token: Record<string, string>
    ) => Promise<Record<string, unknown>>,
    validateProfile: (outletProfileDetails: Record<string, unknown>) => void,
    updateOutletProfileCountByMerchant: (merchantId: string, profileId: string, transaction?: Transaction) => Promise<void>
  ): Promise<OutletProfileMetadata> {
    try {
      const outletProfileDetails = await getOutletProfileDetails(dto.outletId, dto.profileId, token);
      const outletAddress = await this.outletAddressService.find(dto.outletId);
      const merchantData = await this.merchantService.getMerchantById(outletProfileDetails.merchantId as string);
      const outletValues = await this.outletGetService.getOutlet(dto.outletId);
      const searchServiceStatus = dto?.status === OutletProfileStatusEnum.Active;

      if (dto.status === OutletProfileStatusEnum.Active) {
        await this.runOutletProfileActivationValidations(
          dto,
          token,
          outletAddress,
          outletProfileDetails,
          merchantData as unknown as Record<string, unknown>,
          validateProfile
        );
        await this.pushOutletToFinance(
          outletProfileDetails.merchantId as string,
          outletProfileDetails,
          outletAddress?.neighbourhood?.area?.areaName,
          token
        );
      } else if (this.isOutletProfileDeactivatingFromActive(dto, outletProfileDetails)) {
        await this.validateOutletDisabledOnVisa(dto, token);
        await this.validateOutletDisabledOnMastercard(dto, token);
      }

      let updatedOutlet: OutletProfileMetadata | undefined;
      await this.sequelize.transaction(async (transaction: Transaction) => {
        updatedOutlet = await this.updateOutletProfileStatus(dto, userId, transaction);
        await updateOutletProfileCountByMerchant(outletProfileDetails.merchantId as string, dto.profileId, transaction);
      });
      if (!updatedOutlet) {
        throw new Error('Outlet profile status update did not return a result');
      }
      await this.searchServiceProxy.updateOutletStatus(dto?.outletId, dto?.profileId, searchServiceStatus.toString());
      if (dto.profileId === this.mimojoProfileId) {
        await this.moEngageProxy.postOutletActive(
          outletValues?.outletNo,
          (outletProfileDetails?.outletName ?? outletProfileDetails?.name) as string,
          outletProfileDetails?.merchantId as string,
          outletProfileDetails?.merchantName as string,
          token
        );
        this.pushNodeStatusToAuditLog(dto, updatedOutlet);
      }
      return updatedOutlet;
    } catch (error) {
      this.logger.error(`OutletProfileValidationStatusService.validateAndUpdateOutletProfileStatusInternal failed`, {
        error,
      });
      throw new HttpException(
        error?.response ?? 'Failed to update outlet profile status',
        error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private isOutletProfileDeactivatingFromActive(
    dto: UpdateOutletProfileStatusDto,
    outletProfileDetails: { status?: string }
  ): boolean {
    return (
      (dto.status === OutletProfileStatusEnum.Pending || dto.status === OutletProfileStatusEnum.Ready) &&
      outletProfileDetails?.status === OutletProfileStatusEnum.Active &&
      (dto.status !== OutletProfileStatusEnum.Ready || dto.profileId === this.mimojoProfileId)
    );
  }

  private async runOutletProfileActivationValidations(
    dto: UpdateOutletProfileStatusDto,
    token: Record<string, string>,
    outletAddress: OutletAddress,
    outletProfileDetails: Record<string, unknown>,
    merchantData: Record<string, unknown>,
    validateProfile: (outletProfileDetails: Record<string, unknown>) => void
  ): Promise<void> {
    this.validateMerchantStatus(merchantData);
    this.validateOutletAddress(outletAddress, outletProfileDetails?.name as string);
    validateProfile(outletProfileDetails);
    this.validateOutletProfileCategory(outletProfileDetails);
    this.validateOutletProfileHeroImage(outletProfileDetails);
    const [visaLive, mcLive] = await Promise.all([
      this.validateVisaActivation(dto, token),
      this.validateMastercardActivation(dto, token),
    ]);
    if (visaLive?.data?.data?.isLive && mcLive?.data?.data?.isLive) {
      await Promise.all([this.validateOutletVisaEnabled(dto, token), this.validateOutletMastercardEnabled(dto, token)]);
    }
  }

  private validateOutletProfileHeroImage(outletDetails: Record<string, unknown>): void {
    if (!(outletDetails?.outletPhotos as Array<{ isDefault: boolean }>)?.find(p => p.isDefault === true)) {
      throw new HttpException('Please upload hero image!', HttpStatusCode.BadRequest);
    }
  }

  private validateOutletProfileCategory(outletDetails: Record<string, unknown>): void {
    if (outletDetails?.outletFilters == null) {
      throw new HttpException('Please select outlet category!', HttpStatusCode.BadRequest);
    }
  }

  private validateOutletAddress(outletAddress: OutletAddress, outletName: string): void {
    validateOutletAddressOrThrow(outletAddress, outletName);
  }

  private validateMerchantStatus(merchantData: Record<string, unknown> | { status?: string }): void {
    if (merchantData?.status != 'ACTIVE') {
      throw new HttpException('Merchant is not active!', HttpStatusCode.BadRequest);
    }
  }

  private async validateMastercardActivation(
    data: UpdateOutletProfileStatusDto,
    token: Record<string, string>
  ): Promise<{ data?: { data?: { isLive?: boolean } } }> {
    const result = await this.mastercardSchemeServiceProxy.getSchemeTransactionServiceStatus(data.outletId, token);
    if (result?.data?.data?.isLive != true) {
      throw new HttpException('Outlet is not active on mastercard!', HttpStatusCode.BadRequest);
    }
    return result;
  }

  private async validateVisaActivation(
    data: UpdateOutletProfileStatusDto,
    token: Record<string, string>
  ): Promise<{ data?: { data?: { isLive?: boolean } } }> {
    const result = await this.schemeServiceProxy.getSchemeTransactionServiceStatus(data.outletId, token);
    if (result?.data?.data?.isLive != true) {
      throw new HttpException('Outlet is not active on visa!', HttpStatusCode.BadRequest);
    }
    return result;
  }

  private async validateOutletMastercardEnabled(
    data: UpdateOutletProfileStatusDto,
    token: Record<string, string>
  ): Promise<void> {
    const result = await this.mastercardSchemeServiceProxy.getSchemeTransactionEnableOutlet(data.outletId, token);
    if (result?.data?.data?.disableMerchant != true) {
      throw new HttpException('Outlet is not enabled on mastercard!', HttpStatusCode.BadRequest);
    }
  }

  private async validateOutletVisaEnabled(data: UpdateOutletProfileStatusDto, token: Record<string, string>): Promise<void> {
    const result = await this.schemeServiceProxy.getSchemeTransactionEnableOutlet(data.outletId, token);
    if (result?.data?.data?.disableMerchant != true) {
      throw new HttpException('Outlet is not enabled on visa!', HttpStatusCode.BadRequest);
    }
  }

  private async validateOutletDisabledOnMastercard(
    data: UpdateOutletProfileStatusDto,
    token: Record<string, string>
  ): Promise<void> {
    const result = await this.mastercardSchemeServiceProxy.getSchemeTransactionDisableOutlet(data.outletId, token);
    if (result?.data?.data?.disableMerchant != true) {
      throw new HttpException('Outlet is not disabled on mastercard!', HttpStatusCode.BadRequest);
    }
  }

  private async validateOutletDisabledOnVisa(
    data: UpdateOutletProfileStatusDto,
    token: Record<string, string>
  ): Promise<void> {
    const result = await this.schemeServiceProxy.getSchemeTransactionDisableOutlet(data.outletId, token);
    if (result?.data?.data?.disableMerchant != true) {
      throw new HttpException('Outlet is not disabled on visa!', HttpStatusCode.BadRequest);
    }
  }

  private async updateOutletProfileStatus(
    dto: UpdateOutletProfileStatusDto,
    userId: string,
    transaction: Transaction
  ): Promise<OutletProfileMetadata> {
    const [, [updatedData]] = await this.outletProfileModel.update(
      {
        status: dto.status,
        updatedBy: userId,
      },
      {
        where: {
          outletId: dto.outletId,
          profileId: dto.profileId,
        },
        returning: true,
        transaction,
      }
    );
    return updatedData;
  }

  private async pushOutletToFinance(
    merchantId: string,
    outletProfileDetails: Record<string, unknown>,
    city: string,
    token: Record<string, string>
  ): Promise<unknown> {
    if (!outletProfileDetails) return;
    const response = await this.merchantService.getMerchant(merchantId);
    if (!response) return;
    const categoryId = this.resolveFinanceCategoryIdForProfile(outletProfileDetails);
    return this.financeServiceProxy.syncNewOutlet(
      outletProfileDetails.id as string,
      outletProfileDetails.name as string,
      [categoryId],
      city,
      outletProfileDetails.outletNo as string,
      response.merchant?.paymentPlan,
      token,
      response?.merchantConfiguration?.currencyId
    );
  }

  private resolveFinanceCategoryIdForProfile(outletProfileDetails: Record<string, unknown>): string | undefined {
    const outletFilters = outletProfileDetails.outletFilters as
      | Array<{ filter?: { category?: { id: string }; subCategory?: { id: string } } }>
      | undefined;
    let categoryId = outletFilters?.[0]?.filter?.category?.id;
    if (categoryId === this.FoodAndDrinkCategoryId && outletFilters) {
      const subCategoryIds = outletFilters.map(f => f.filter?.subCategory?.id);
      const includedSubCategories = this.fbCategoryTypeIds?.filter(id => subCategoryIds.includes(id)) ?? [];
      if (includedSubCategories.length) categoryId = includedSubCategories[0];
    }
    return categoryId;
  }

  pushNodeStatusToAuditLog(request: UpdateOutletProfileStatusDto, response: OutletProfileMetadata): void {
    const statusMap: Partial<Record<OutletProfileStatusEnum, string>> = {
      [OutletProfileStatusEnum.Pending]: 'PENDING',
      [OutletProfileStatusEnum.Ready]: 'INACTIVE',
      [OutletProfileStatusEnum.Active]: 'ACTIVE',
    };
    const status = statusMap[request.status] ?? request.status;
    this.pushOutletProfileAuditLog('mimojo-places-service', { status, values: response }, EnvKeysEnum.AUDIT_LOG_NODE_STATUS);
  }

  private pushOutletProfileAuditLog(
    service: string,
    payload: { status: string; values: unknown },
    configKey: EnvKeysEnum
  ): void {
    this.dataOperationsProducer.pushToAuditLogService(service, payload, {
      audit_main_node_configuration_id: process.env[configKey],
    });
  }
}
