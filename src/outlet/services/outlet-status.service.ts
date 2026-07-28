import { HttpException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { HttpStatusCode } from 'axios';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { EnvKeysEnum } from 'config/env.enum';
import { OutletProducer } from 'src/kafka-services/outlet.producer';
import { MerchantService } from 'src/merchant/services/merchant.service';
import { OutletFastPaymentStatusDto } from '../dtos/fast-payment-status.dto';
import { MerchantStatusUpdatedDto } from '../dtos/merchant-status-dto';
import { UploadOutletStatusDto } from '../dtos/update-status-dto';
import { OutletFastPaymentStatusEnum, OutletStatusEnum } from '../enums/outlet-status-enum';
import { OutletAddress } from '../models/outlet-address.model';
import { OutletPhoto } from '../models/outlet-photo.model';
import { Merchant } from 'src/merchant/entities/merchant.model';
import { Outlet } from '../models/outlet.model';
import { FastPaymentServiceProxy } from '../proxies/fast-payment-service.proxy';
import { MastercardSchemeServiceProxy } from '../proxies/mc-scheme-service.proxy';
import { MoEngageProxy } from '../proxies/moengage.proxy';
import { PosServiceProxy } from '../proxies/pos-service.proxy';
import { SchemeServiceProxy } from '../proxies/scheme-service.proxy';
import { OutletAddressService } from './outlet-address.service';
import { OutletGetService } from './outlet-get.service';
import { SearchServiceProxy } from '../proxies/search-service.proxy';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';
import { validateOutletAddressOrThrow } from '../shared/outlet-address-validation.util';
import { OutletDetailsView } from './outlet-details-view.interface';

type OutletStatusSideEffects = {
  pushOutletToFinance: (
    merchantId: string,
    outletDetails: OutletDetailsView,
    city: string,
    t: Record<string, string>
  ) => Promise<unknown>;
  pushOutletActiveStatusToKafka: (merchantId: string, outletId: string, profileId: string) => Promise<void>;
  pushNodeStatusToAuditLog: (request: UploadOutletStatusDto, response: Outlet) => Promise<void>;
  updateOutletCountByMerchant: (merchantId: string) => Promise<void>;
};

@Injectable()
export class OutletStatusService {
  private readonly serviceName = 'OutletStatusService';

  constructor(
    @InjectModel(Outlet)
    private readonly outletModel: typeof Outlet,
    @Inject(forwardRef(() => OutletGetService))
    private readonly outletGetService: OutletGetService,
    private readonly outletAddressService: OutletAddressService,
    @Inject(forwardRef(() => MerchantService))
    private readonly merchantService: MerchantService,
    private readonly schemeServiceProxy: SchemeServiceProxy,
    private readonly mastercardSchemeServiceProxy: MastercardSchemeServiceProxy,
    private readonly fastPaymentServiceProxy: FastPaymentServiceProxy,
    private readonly posServiceProxy: PosServiceProxy,
    private readonly searchServiceProxy: SearchServiceProxy,
    private readonly outletProducer: OutletProducer,
    private readonly moEngageProxy: MoEngageProxy,
    private readonly logger: CustomPinoLogger
  ) {}

  async validateAndUpdateOutletStatus(
    data: UploadOutletStatusDto,
    token: Record<string, string>,
    userId: string,
    sideEffects: OutletStatusSideEffects
  ): Promise<Outlet> {
    return this.validateAndUpdateOutletStatusBySource('offer', data, token, userId, sideEffects);
  }

  async validateAndUpdateOutletStatusRewardEngine(
    data: UploadOutletStatusDto,
    token: Record<string, string>,
    userId: string,
    sideEffects: OutletStatusSideEffects
  ): Promise<Outlet> {
    return this.validateAndUpdateOutletStatusBySource('rewardEngine', data, token, userId, sideEffects);
  }

  private async validateAndUpdateOutletStatusBySource(
    source: 'offer' | 'rewardEngine',
    data: UploadOutletStatusDto,
    token: Record<string, string>,
    userId: string,
    sideEffects: OutletStatusSideEffects
  ): Promise<Outlet> {
    const getOutletDetails =
      source === 'offer'
        ? (outletId: string, headers: Record<string, string>) => this.outletGetService.getOutletDetails(outletId, headers)
        : (outletId: string, headers: Record<string, string>) =>
            this.outletGetService.getOutletDetailsRewardEngine(outletId, headers);

    const validateProfile =
      source === 'offer'
        ? (outletDetails: OutletDetailsView) => this.validateOutletOffer(outletDetails)
        : (outletDetails: OutletDetailsView) => this.validateOutletReward(outletDetails);

    return this.validateAndUpdateOutletStatusInternal(data, token, userId, getOutletDetails, validateProfile, sideEffects);
  }

  private async validateAndUpdateOutletStatusInternal(
    data: UploadOutletStatusDto,
    token: Record<string, string>,
    userId: string,
    getOutletDetails: (outletId: string, token: Record<string, string>) => Promise<OutletDetailsView>,
    validateProfile: (outletDetails: OutletDetailsView) => void,
    sideEffects: OutletStatusSideEffects
  ): Promise<Outlet> {
    const { pushOutletToFinance, pushOutletActiveStatusToKafka, pushNodeStatusToAuditLog, updateOutletCountByMerchant } =
      sideEffects;
    const outlet = await this.outletGetService.getMerchantId(data.outletId);
    const outletDetails = await getOutletDetails(data.outletId, token);
    const outletAddress = await this.outletAddressService.find(data.outletId);
    const merchantData = await this.merchantService.getMerchantById(outlet.merchantId);
    const outletValues = await this.outletGetService.getOutlet(data.outletId);

    if (data.status === OutletStatusEnum.Active) {
      await this.runActivationValidations(data, token, outletAddress, outletDetails, merchantData, validateProfile);
      await pushOutletToFinance(outlet.merchantId, outletDetails, outletAddress?.neighbourhood?.area?.areaName, token);
      await pushOutletActiveStatusToKafka(outlet.merchantId, data.outletId, outletDetails?.outletProfileMetadata?.profileId);
    } else if (this.isDeactivatingFromActive(data.status, outletValues?.status)) {
      await this.validateOutletDisabledOnVisa(data, token);
      await this.validateOutletDisabledOnMastercard(data, token);
    }

    const updatedUser = await this.updateOutletStatus(data, userId, outletDetails);
    await this.searchServiceProxy.updateOutletStatus(
      data?.outletId,
      (data?.status === OutletStatusEnum.Active).toString(),
      outletDetails?.outletProfileMetadata?.profileId
    );
    await updateOutletCountByMerchant(outlet.merchantId);
    await this.moEngageProxy.postOutletActive(
      outletDetails?.outletNo,
      outletDetails?.name,
      outlet.merchantId,
      outlet.merchantName,
      token
    );
    await pushNodeStatusToAuditLog(data, updatedUser);
    return updatedUser;
  }

  private isDeactivatingFromActive(newStatus: OutletStatusEnum, currentStatus?: string): boolean {
    return (
      (newStatus === OutletStatusEnum.Pending || newStatus === OutletStatusEnum.Ready) &&
      currentStatus === OutletStatusEnum.Active
    );
  }

  private async runActivationValidations(
    data: UploadOutletStatusDto,
    token: Record<string, string>,
    outletAddress: OutletAddress,
    outletDetails: OutletDetailsView,
    merchantData: Merchant,
    validateProfile: (outletDetails: OutletDetailsView) => void
  ): Promise<void> {
    this.validateMerchantStatus(merchantData);
    this.validateOutletAddress(outletAddress, outletDetails);
    validateProfile(outletDetails);
    this.validateOutletCategory(outletDetails);
    this.validateOutletHeroImage(outletDetails);
    const [visaLive, mcLive] = await Promise.all([
      this.validateVisaActivation(data, token),
      this.validateMastercardActivation(data, token),
    ]);
    if (visaLive?.data?.data?.isLive && mcLive?.data?.data?.isLive) {
      await Promise.all([this.validateOutletVisaEnabled(data, token), this.validateOutletMastercardEnabled(data, token)]);
    }
  }

  async updateFastPaymentStatus(
    body: OutletFastPaymentStatusDto,
    headers: Record<string, string>,
    userId: string
  ): Promise<Outlet> {
    const merchantData = await this.fastPaymentServiceProxy.getCircleMerchantMetadata(body.merchantId, headers);
    const outlet = await this.outletModel.findOne({ where: { outletId: body.outletId } });
    if (!outlet) {
      throw new HttpException('Outlet is not found!', HttpStatusCode.BadRequest);
    }

    if (body.status === OutletFastPaymentStatusEnum.ACTIVE) {
      const outletAddress = await this.outletAddressService.find(body.outletId);
      const outletDetails = await this.outletGetService.getOutletDetails(body.outletId, headers);
      this.validateFastPaymentMerchantStatus(merchantData);
      this.validateOutletAddress(outletAddress, outletDetails);
      await this.validateMinimumOutletTab(body.outletId, headers);
      await this.validatePosConfig(body.outletId, headers);
      await this.validateOutletPriceConfig(body.outletId, headers);
    }

    try {
      const data = await this.fastPaymentServiceProxy.upsertFastPaymentStatus(body, headers);
      if (data?.data === true) {
        const [, [outletStatus]] = await this.outletModel.update(
          { fastPaymentStatus: body.status, updatedBy: userId },
          { where: { outletId: body.outletId }, returning: true }
        );
        return outletStatus;
      }
    } catch (e) {
      this.logger.error('OutletStatusService.updateFastPaymentStatus method error', { e });
    }
    return outlet;
  }

  private async updateOutletStatus(
    data: UploadOutletStatusDto,
    userId: string,
    outletDetails: OutletDetailsView
  ): Promise<Outlet> {
    const [rowsAffected, [updatedUser]] = await this.outletModel.update(
      { status: data.status, updatedBy: userId },
      {
        where: { outletId: data.outletId },
        returning: true,
      }
    );

    if (rowsAffected === 0) {
      throw new NotFoundException(`Outlet with id ${data.outletId} not found`);
    }
    const finalData = { ...updatedUser.dataValues };
    finalData['outletHeroImage'] = outletDetails.outletPhotos?.find(p => p.isDefault === true)?.cdnUrl;
    this.outletProducer.pushToKafka('teams', finalData, process.env[EnvKeysEnum.KAFKA_NOTIFICATION_TOPIC]);
    return updatedUser;
  }

  private async validateOutletDisabledOnMastercard(
    data: UploadOutletStatusDto,
    token: Record<string, string>
  ): Promise<void> {
    const mcSchemeServiceDisableOutlet = await this.mastercardSchemeServiceProxy.getSchemeTransactionDisableOutlet(
      data.outletId,
      token
    );
    if (mcSchemeServiceDisableOutlet?.data?.data?.disableMerchant != true) {
      throw new HttpException('Outlet is not disabled on mastercard!', HttpStatusCode.BadRequest);
    }
  }

  private async validateOutletDisabledOnVisa(data: UploadOutletStatusDto, token: Record<string, string>): Promise<void> {
    const schemeServiceDisableOutlet = await this.schemeServiceProxy.getSchemeTransactionDisableOutlet(data.outletId, token);
    if (schemeServiceDisableOutlet?.data?.data?.disableMerchant != true) {
      throw new HttpException('Outlet is not disabled on visa!', HttpStatusCode.BadRequest);
    }
  }

  private async validateOutletMastercardEnabled(data: UploadOutletStatusDto, token: Record<string, string>): Promise<void> {
    const mcSchemeServiceEnableOutlet = await this.mastercardSchemeServiceProxy.getSchemeTransactionEnableOutlet(
      data.outletId,
      token
    );
    if (mcSchemeServiceEnableOutlet?.data?.data?.disableMerchant != true) {
      throw new HttpException('Outlet is not enabled on mastercard!', HttpStatusCode.BadRequest);
    }
  }

  private async validateOutletVisaEnabled(data: UploadOutletStatusDto, token: Record<string, string>): Promise<void> {
    const schemeServiceEnableOutlet = await this.schemeServiceProxy.getSchemeTransactionEnableOutlet(data.outletId, token);
    if (schemeServiceEnableOutlet?.data?.data?.disableMerchant != true) {
      throw new HttpException('Outlet is not enabled on visa!', HttpStatusCode.BadRequest);
    }
  }

  private async validateMastercardActivation(
    data: UploadOutletStatusDto,
    token: Record<string, string>
  ): Promise<{ data?: { data?: { isLive?: boolean } } }> {
    const mcSchemeServiceOutletLiveCheck = await this.mastercardSchemeServiceProxy.getSchemeTransactionServiceStatus(
      data.outletId,
      token
    );
    if (mcSchemeServiceOutletLiveCheck?.data?.data?.isLive != true) {
      throw new HttpException('Outlet is not active on mastercard!', HttpStatusCode.BadRequest);
    }
    return mcSchemeServiceOutletLiveCheck;
  }

  private async validateVisaActivation(
    data: UploadOutletStatusDto,
    token: Record<string, string>
  ): Promise<{ data?: { data?: { isLive?: boolean } } }> {
    const schemeServiceOutletLiveCheck = await this.schemeServiceProxy.getSchemeTransactionServiceStatus(
      data.outletId,
      token
    );
    if (schemeServiceOutletLiveCheck?.data?.data?.isLive != true) {
      throw new HttpException('Outlet is not active on visa!', HttpStatusCode.BadRequest);
    }
    return schemeServiceOutletLiveCheck;
  }

  private validateOutletHeroImage(outletDetails: OutletDetailsView): void {
    if (!outletDetails?.outletPhotos.find(p => p.isDefault === true)) {
      throw new HttpException('Please upload hero image!', HttpStatusCode.BadRequest);
    }
  }

  private validateOutletCategory(outletDetails: OutletDetailsView): void {
    if (outletDetails?.outletFilters == null) {
      throw new HttpException('Please select outlet category!', HttpStatusCode.BadRequest);
    }
  }

  private validateOutletOffer(outletDetails: OutletDetailsView): void {
    if (
      outletDetails?.outletNormalOffer == null &&
      outletDetails?.outletCustomHours?.length == 0 &&
      outletDetails?.outletTieredOffers == null
    ) {
      throw new HttpException('Please create outlet offer!', HttpStatusCode.BadRequest);
    }
  }

  private validateOutletReward(outletDetails: OutletDetailsView): void {
    if (!outletDetails?.offer?.rules?.length) {
      throw new HttpException('Please create outlet offer!', HttpStatusCode.BadRequest);
    }
  }

  private validateOutletAddress(outletAddress: OutletAddress, outletDetails: OutletDetailsView): void {
    validateOutletAddressOrThrow(outletAddress, outletDetails?.name);
  }

  private validateMerchantStatus(merchantData: Merchant): void {
    if (merchantData?.status != 'ACTIVE') {
      throw new HttpException('Merchant is not active!', HttpStatusCode.BadRequest);
    }
  }

  private validateFastPaymentMerchantStatus(merchantData: { data?: { data?: { status?: string } } }): void {
    if (merchantData?.data?.data?.status != 'ACTIVE') {
      throw new HttpException('Merchant is not active!', HttpStatusCode.BadRequest);
    }
  }

  private async validateMinimumOutletTab(outletId: string, headers: Record<string, string>): Promise<void> {
    const { data } = await this.fastPaymentServiceProxy.getOutletTabs(outletId, headers);
    if (!data?.data || data?.data?.length < 1) {
      throw new HttpException('Minimum one tab is required', HttpStatusCode.BadRequest);
    }
  }

  private async validatePosConfig(outletId: string, headers: Record<string, string>): Promise<void> {
    const { data } = await this.posServiceProxy.getPosConfig(outletId, headers);
    if (!data?.data) {
      throw new HttpException('POS Configuration required', HttpStatusCode.BadRequest);
    }
  }

  private async validateOutletPriceConfig(outletId: string, headers: Record<string, string>): Promise<void> {
    const { data } = await this.fastPaymentServiceProxy.getOutletPriceConfig(outletId, headers);
    if (!data?.data) {
      throw new HttpException('Price Configuration required', HttpStatusCode.BadRequest);
    }
  }

  async updateOutletsStatus(
    data: MerchantStatusUpdatedDto,
    transaction: Transaction,
    token: Record<string, string>,
    userId: string
  ): Promise<void> {
    if (data.cloMerchantStatus === false) {
      await this.deactivateCloOutlets(data.merchantId, token, userId, transaction);
    }
    if (data.circleMerchantStatus === false) {
      await this.deactivateCircleOutlets(data.merchantId, token, userId);
    }
  }

  private async deactivateCloOutlets(
    merchantId: string,
    token: Record<string, string>,
    userId: string,
    transaction: Transaction
  ): Promise<void> {
    const allOutlets = await this.outletModel.findAll({
      include: [
        {
          model: OutletPhoto,
          where: { isDefault: true, isActive: true },
        },
      ],
      where: { merchantId, status: OutletStatusEnum.Active },
    });
    for (const outletData of allOutlets) {
      await this.ensureOutletDisabledOnSchemes(outletData.outletId, token);
      const finalData = { ...outletData.dataValues };
      finalData.status = OutletStatusEnum.Pending;
      finalData['outletHeroImage'] = outletData.outletPhotos?.[0]?.cdnUrl;
      finalData.outletPhotos = null;
      this.outletProducer.pushToKafka('teams', finalData, process.env[EnvKeysEnum.KAFKA_NOTIFICATION_TOPIC]);
    }
    await this.outletModel.update(
      { status: OutletStatusEnum.Ready, updatedBy: userId },
      {
        where: { merchantId, status: OutletStatusEnum.Active },
        transaction,
      }
    );
  }

  private async ensureOutletDisabledOnSchemes(outletId: string, token: Record<string, string>): Promise<void> {
    const [visa, mastercard] = await Promise.all([
      this.schemeServiceProxy.getSchemeTransactionDisableOutlet(outletId, token),
      this.mastercardSchemeServiceProxy.getSchemeTransactionDisableOutlet(outletId, token),
    ]);
    if (!visa?.data?.data?.disableMerchant) {
      throw new HttpException('Outlet is not disabled on visa!', HttpStatusCode.BadRequest);
    }
    if (!mastercard?.data?.data?.disableMerchant) {
      throw new HttpException('Outlet is not disabled on mastercard!', HttpStatusCode.BadRequest);
    }
  }

  private async deactivateCircleOutlets(merchantId: string, token: Record<string, string>, userId: string): Promise<void> {
    const allOutlets = await this.outletModel.findAll({
      where: { merchantId, fastPaymentStatus: OutletFastPaymentStatusEnum.ACTIVE },
    });
    for (const outletData of allOutlets) {
      const outlet = { ...outletData.dataValues };
      await this.fastPaymentServiceProxy.upsertFastPaymentStatus(
        {
          outletId: outlet.outletId,
          merchantId,
          name: outlet.name,
          status: OutletFastPaymentStatusEnum.READY,
        },
        token
      );
      await outletData.update({
        fastPaymentStatus: OutletFastPaymentStatusEnum.READY,
        updatedBy: userId,
      });
    }
  }
}
