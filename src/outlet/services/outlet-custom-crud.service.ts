import { HttpException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { HttpStatusCode } from 'axios';
import { InjectModel } from '@nestjs/sequelize';
import { EnvKeysEnum } from 'config/env.enum';
import { OutletProducer } from 'src/kafka-services/outlet.producer';
import { MerchantService } from 'src/merchant/services/merchant.service';
import { AddOutletConfigDto } from '../dtos/add-outlet-dto';
import { CreateCustomOutletDto } from '../dtos/create-custom-outlet-dto';
import { CustomOutletFiltersDto } from '../dtos/custom-outlet-filter-dto';
import { OutletFastPaymentStatusDto } from '../dtos/fast-payment-status.dto';
import { UpdateOutletDto } from '../dtos/update-outlet-dto';
import { OutletSourceEnum } from '../enums/outlet-source-enum';
import { OutletFastPaymentStatusEnum, OutletStatusEnum } from '../enums/outlet-status-enum';
import { Merchant } from 'src/merchant/entities/merchant.model';
import { Outlet } from '../models/outlet.model';
import { FastPaymentServiceProxy } from '../proxies/fast-payment-service.proxy';
import { OutletFilterService } from './outlet-filters.service';
import { OutletHelperService } from './outlet-helper.service';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';
import { Transaction } from 'sequelize';

@Injectable()
export class OutletCustomCrudService {
  private readonly serviceName = 'OutletCustomCrudService';

  constructor(
    @InjectModel(Outlet)
    private readonly outletModel: typeof Outlet,
    private readonly outletFilterService: OutletFilterService,
    private readonly outletHelperService: OutletHelperService,
    private readonly fastPaymentServiceProxy: FastPaymentServiceProxy,
    private readonly outletProducer: OutletProducer,
    @Inject(forwardRef(() => MerchantService))
    private readonly merchantService: MerchantService,
    private readonly logger: CustomPinoLogger
  ) {}

  async addEditCustomOutlet(
    data: CreateCustomOutletDto,
    transaction: Transaction,
    token: Record<string, string>,
    userId: string
  ): Promise<Outlet> {
    this.logger.info(`${this.serviceName}.addEditCustomOutlet - start`, { data });
    const merchantMetadata = await this.merchantService.getMerchantById(data.merchantId);
    const {
      merchantName,
      merchantNameAr,
      merchantLogo,
      merchantDesc,
      merchantDescAr,
      outletName,
      outletNameAr,
      outletStatus,
      fastPaymentStatus,
    } = this.buildMerchantOutletData(data, merchantMetadata);
    const jsonArray = data.midPidRelation?.map(ids => JSON.parse(JSON.stringify(ids)));
    const midMatch: string[] = [];
    await this.validateMidPidRelations(data, jsonArray, midMatch);
    this.mergeMerchantDescriptions(data, merchantMetadata);
    const { response, promises } = await this.createOrUpdateCustomOutlet({
      data,
      transaction,
      merchantMetadata,
      merchantName,
      merchantNameAr,
      merchantLogo,
      outletName,
      outletNameAr,
      merchantDesc,
      merchantDescAr,
      jsonArray,
      userId,
      outletStatus,
      fastPaymentStatus,
      token,
    });

    await this.attachFastPaymentConfigurations(data, response, token, promises);
    this.pushPosConfigIfPresent(data, response);

    if (midMatch.length > 0) {
      (response as Outlet & { dataValues: { warning?: unknown } }).dataValues.warning = midMatch;
    }
    return response;
  }

  buildMerchantOutletData(
    data: CreateCustomOutletDto,
    merchantMetadata: Merchant
  ): {
    merchantName: string;
    merchantNameAr: string;
    merchantLogo: string;
    merchantDesc: string;
    merchantDescAr: string;
    outletName: string | null;
    outletNameAr: string | null;
    outletStatus: OutletStatusEnum;
    fastPaymentStatus: OutletFastPaymentStatusEnum;
  } {
    this.logger.info(`${this.serviceName}.buildMerchantOutletData - start`, { data, merchantMetadata });
    const merchantName = merchantMetadata?.name.trim();
    const merchantNameAr = merchantMetadata?.nameAr?.trim() ?? merchantName;
    const merchantLogo = merchantMetadata?.imageUrl;
    const merchantDesc = merchantMetadata?.desc;
    const merchantDescAr = merchantMetadata?.descAr ?? merchantDesc;

    const outletName =
      merchantName?.trim() && data.outletAddress?.location?.trim()
        ? `${merchantName.trim()} - ${data.outletAddress?.location.trim()}`
        : null;

    const outletNameAr =
      merchantName?.trim() && data.outletAddress?.locationAr?.trim()
        ? `${merchantNameAr.trim()} - ${data.outletAddress?.locationAr.trim()}`
        : (outletName ?? null);

    const outletStatus =
      merchantMetadata?.status === 'NOT ENROLLED' ? OutletStatusEnum['Not Enrolled'] : OutletStatusEnum.Pending;

    const fastPaymentStatus =
      merchantMetadata?.fastPaymentStatus === 'NOT ENROLLED'
        ? OutletFastPaymentStatusEnum['NOT ENROLLED']
        : OutletFastPaymentStatusEnum.PENDING;
    this.logger.info(`${this.serviceName}.buildMerchantOutletData - end`, {
      merchantName,
      outletName,
      outletStatus,
    });
    return {
      merchantName,
      merchantNameAr,
      merchantLogo,
      merchantDesc,
      merchantDescAr,
      outletName,
      outletNameAr,
      outletStatus,
      fastPaymentStatus,
    };
  }

  async validateMidPidRelations(
    data: CreateCustomOutletDto,
    jsonArray: Record<string, unknown>[],
    midMatch: string[]
  ): Promise<string[]> {
    this.logger.info(`${this.serviceName}.validateMidPidRelations - start`, { data, jsonArray });
    if (!jsonArray?.length) return [];
    const mids = jsonArray.map(ids => ids.merchantId);
    const formattedMids = `{${mids.join(',')}}`;
    const tidResponse = await this.outletModel.sequelize.query('SELECT * FROM get_mid_pid_relation(:merchant_ids)', {
      replacements: { merchant_ids: formattedMids },
      model: Outlet,
    });
    if (!tidResponse?.length) return [];
    const posMatch: string[] = [];
    const relationData = data.midPidRelation || [];
    relationData.forEach(reqMp => {
      tidResponse.forEach(record => {
        const recordData = (record?.dataValues ?? {}) as Record<string, unknown>;
        const relationList = (recordData.midPidRelation || []) as Array<{
          merchantId?: string;
          posIds?: string[];
        }>;
        relationList.forEach(dataMp => {
          if (reqMp.merchantId === dataMp.merchantId && data.id !== (recordData.outletId as string)) {
            this.logger.info(`${this.serviceName}.validateMidPidRelations - matching merchant id found`, {
              reqMp,
              dataMp,
              recordData,
            });
            const matchingPosIds = reqMp.posIds?.filter(posId => dataMp.posIds?.includes(posId)) ?? [];

            if (matchingPosIds.length > 0) {
              posMatch.push(
                `The following terminal id(s) - ${matchingPosIds.join(',')} is already related to merchant id ${dataMp.merchantId} in outlet ${recordData.name as string}`
              );
            } else {
              midMatch.push(`The merchant id ${dataMp.merchantId} is already used in outlet ${recordData.name as string}`);
            }
          }
        });
      });
    });

    if (posMatch.length > 0) {
      throw new HttpException({ message: posMatch }, HttpStatusCode.InternalServerError);
    }
    this.logger.info(`${this.serviceName}.validateMidPidRelations - end`, { midMatch });
    return midMatch?.length ? midMatch : [];
  }

  mergeMerchantDescriptions(data: CreateCustomOutletDto, merchantMetadata: Merchant): void {
    this.logger.info(`${this.serviceName}.mergeMerchantDescriptions - start`, { data, merchantMetadata });
    if (!data?.artDesc || data.artDesc.length === 0) {
      data.artDesc = merchantMetadata?.artDesc ?? [];
    } else if (!data?.id) {
      data.artDesc = [...data.artDesc, ...(merchantMetadata?.artDesc ?? [])];
    }

    if (!data?.competitorDesc || data.competitorDesc.length === 0) {
      data.competitorDesc = merchantMetadata?.competitorDesc ?? [];
    } else if (!data?.id) {
      data.competitorDesc = [...data.competitorDesc, ...(merchantMetadata?.competitorDesc ?? [])];
    }
    this.logger.info(`${this.serviceName}.mergeMerchantDescriptions - end`, { data });
  }

  private async createOrUpdateCustomOutlet(params: {
    data: CreateCustomOutletDto;
    transaction: Transaction;
    merchantMetadata: Merchant;
    merchantName: string;
    merchantNameAr: string;
    merchantLogo: string;
    outletName: string;
    outletNameAr: string;
    merchantDesc: string;
    merchantDescAr: string;
    jsonArray: Record<string, unknown>[];
    userId: string;
    outletStatus: OutletStatusEnum;
    fastPaymentStatus: OutletFastPaymentStatusEnum;
    token: Record<string, string>;
  }): Promise<{ response: Outlet; promises: Promise<unknown>[] }> {
    const {
      data,
      transaction,
      merchantMetadata,
      merchantName,
      merchantNameAr,
      merchantLogo,
      outletName,
      outletNameAr,
      merchantDesc,
      merchantDescAr,
      jsonArray,
      userId,
      outletStatus,
      fastPaymentStatus,
      token,
    } = params;

    let merchantPreferencesFilter: CustomOutletFiltersDto[] = data.outletFilters;
    const promises: Promise<unknown>[] = [];
    let response: Outlet;

    if (data.id) {
      this.logger.info(`${this.serviceName}.addEditCustomOutlet - updating custom outlet`, { outletId: data.id });
      response = await this.updateCustomOutlet(
        data,
        transaction,
        merchantName,
        merchantLogo,
        outletName,
        outletNameAr,
        merchantDesc,
        merchantDescAr,
        jsonArray,
        userId,
        merchantNameAr
      );
      await this.outletFilterService.addOutletFilters(response.outletId, merchantPreferencesFilter, transaction, userId);
      const updateBody: UpdateOutletDto = {
        name: outletName,
        description: data.messageDescription,
      };
      const fastPayment = this.fastPaymentServiceProxy.updateOutlet(data.id, updateBody, token).then(fastPayment => {
        (response as Outlet & { dataValues: { messageDescription?: string } }).dataValues.messageDescription =
          fastPayment?.data?.description;
      });
      promises.push(fastPayment);
    } else {
      this.logger.info(`${this.serviceName}.addEditCustomOutlet - creating custom outlet`);
      merchantPreferencesFilter = this.outletHelperService.mapFilterDto(merchantPreferencesFilter, merchantMetadata);
      response = await this.insertCustomOutlet(
        data,
        transaction,
        merchantName,
        merchantLogo,
        outletName,
        outletNameAr,
        merchantDesc,
        merchantDescAr,
        jsonArray,
        userId,
        merchantNameAr,
        outletStatus,
        fastPaymentStatus
      );
      const body: OutletFastPaymentStatusDto = {
        outletId: response.outletId,
        merchantId: data.merchantId,
        name: outletName,
        status: fastPaymentStatus,
      };
      const fastPayment = this.fastPaymentServiceProxy.upsertFastPaymentStatus(body, token);
      promises.push(fastPayment);
      await this.outletFilterService.addOutletFilters(response.outletId, merchantPreferencesFilter, transaction, userId);
    }

    return { response, promises };
  }

  private async attachFastPaymentConfigurations(
    data: CreateCustomOutletDto,
    response: Outlet,
    token: Record<string, string>,
    promises: Promise<unknown>[]
  ): Promise<void> {
    if (data.tabs) {
      const tabsPromise = this.fastPaymentServiceProxy.addOutletTab(data.tabs, response.outletId, token).then(tabs => {
        (response as Outlet & { dataValues: { tabs?: unknown } }).dataValues.tabs = tabs?.data?.data;
      });
      promises.push(tabsPromise);
    }

    if (data.config) {
      const configRequest: AddOutletConfigDto = {
        countryName: data.config?.countryName,
        cityName: data.config?.cityName,
        redirectBaseURL: data.config?.redirectBaseURL,
        menuLink: data.config?.menuLink ?? null,
        hasInroomDining: data.config?.hasInroomDining ?? null,
        disabledPaymentMethods: data.config?.disabledPaymentMethods ?? null,
      };

      const configPromise = this.fastPaymentServiceProxy
        .addOutletConfig(configRequest, response.outletId, token)
        .then(config => {
          (response as Outlet & { dataValues: { config?: unknown } }).dataValues.config = config?.data?.data;
        });
      promises.push(configPromise);
    }

    if (data.priceConfig) {
      const priceConfigPromise = this.fastPaymentServiceProxy
        .addOutletPriceConfig(data.priceConfig, response.outletId, token)
        .then(priceConfig => {
          (response as Outlet & { dataValues: { priceConfig?: unknown } }).dataValues.priceConfig = priceConfig?.data?.data;
        });
      promises.push(priceConfigPromise);
    }

    await Promise.all(promises);
  }

  private pushPosConfigIfPresent(data: CreateCustomOutletDto, response: Outlet): void {
    if (!data.posConfig) return;
    this.outletProducer.pushToKafka(
      'pos-config',
      {
        ...data.posConfig,
        outletId: response.outletId,
      },
      process.env[EnvKeysEnum.KAFKA_POS_TOPIC]
    );
  }

  async insertCustomOutlet(
    data: CreateCustomOutletDto,
    transaction: Transaction,
    merchantName: string,
    merchantLogo: string,
    outletName: string,
    outletNameAr: string,
    merchantDesc: string,
    merchantDescAr: string,
    jsonArray: Record<string, unknown>[],
    userId: string,
    merchantNameAr: string,
    status: OutletStatusEnum,
    fastPaymentStatus: OutletFastPaymentStatusEnum
  ): Promise<Outlet> {
    return await this.outletModel.create(
      {
        merchantId: data.merchantId,
        merchantName: merchantName.trim(),
        merchantNameAr: merchantNameAr.trim(),
        merchantLogoUrl: merchantLogo,
        name: outletName?.trim(),
        nameAr: outletNameAr?.trim(),
        rating: data.rating ?? 0,
        businessStatus: data.businessStatus?.trim(),
        formattedPhoneNumber: data.formattedPhoneNumber?.trim(),
        priceLevel: data.priceLevel ?? 0,
        userRatingsTotal: data.userRatingsTotal,
        website: data.website?.trim(),
        websiteAr: data.websiteAr?.trim() ?? data.website?.trim(),
        merchantIdsManual: data.merchantIdsManual,
        posIds: data.posIds,
        description: merchantDesc,
        descriptionAr: merchantDescAr,
        status,
        fastPaymentStatus,
        source: OutletSourceEnum.Custom,
        menuUrl: data.menuUrl,
        menuUrlAr: data.menuUrlAr ?? data.menuUrl,
        bookingUrl: data.bookingUrl,
        bookingUrlAr: data.bookingUrlAr ?? data.bookingUrl,
        midPidRelation: jsonArray as unknown as JSON[],
        artDesc: data.artDesc ?? null,
        competitorDesc: data.competitorDesc ?? null,
        checkTerminal: data.checkTerminal,
        updatedBy: userId,
      },
      { transaction }
    );
  }

  async updateCustomOutlet(
    data: CreateCustomOutletDto,
    transaction: Transaction,
    merchantName: string,
    merchantLogo: string,
    outletName: string,
    outletNameAr: string,
    merchantDesc: string,
    merchantDescAr: string,
    jsonArray: Record<string, unknown>[],
    userId: string,
    merchantNameAr: string
  ): Promise<Outlet> {
    const [rowsAffected, [updatedUser]] = await this.outletModel.update(
      {
        bookingUrl: data.bookingUrl,
        bookingUrlAr: data.bookingUrlAr ?? data.bookingUrl,
        businessStatus: data.businessStatus,
        formattedPhoneNumber: data.formattedPhoneNumber,
        menuUrl: data.menuUrl,
        menuUrlAr: data.menuUrlAr ?? data.menuUrl,
        merchantIdsManual: data.merchantIdsManual,
        name: outletName?.trim(),
        nameAr: outletNameAr?.trim(),
        merchantName: merchantName?.trim(),
        merchantNameAr: merchantNameAr.trim(),
        merchantLogoUrl: merchantLogo,
        description: merchantDesc,
        descriptionAr: merchantDescAr,
        posIds: data.posIds,
        priceLevel: data.priceLevel ?? 0,
        rating: data.rating ?? 0,
        userRatingsTotal: data.userRatingsTotal,
        website: data.website,
        websiteAr: data.websiteAr ?? data.website,
        merchantId: data?.merchantId,
        midPidRelation: jsonArray as unknown as JSON[],
        checkTerminal: data.checkTerminal,
        artDesc: data.artDesc ?? null,
        competitorDesc: data.competitorDesc ?? null,
        updatedBy: userId,
      },
      {
        where: { outletId: data.id },
        returning: true,
        transaction: transaction,
      }
    );
    if (rowsAffected === 0) {
      throw new NotFoundException(`Outlet with id ${data.id} not found`);
    }
    return updatedUser;
  }
}
