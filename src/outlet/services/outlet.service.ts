import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { HttpStatusCode } from 'axios';
import { EnvKeysEnum } from 'config/env.enum';
import { Op, Sequelize, Transaction } from 'sequelize';
import { baseResponseHelper } from 'src/helpers/base-response.helper';
import { UpdateMerchantOutletsNumberDto } from 'src/merchant/dtos/update-merchant-outlets-number.dto';
import { MerchantService } from 'src/merchant/services/merchant.service';
import { OutletFilterService } from 'src/outlet/services/outlet-filters.service';
import { CreateCustomOutletDto } from '../dtos/create-custom-outlet-dto';
import { CreateOutletDto } from '../dtos/create-outlet-dto';
import { CustomOutletFiltersDto } from '../dtos/custom-outlet-filter-dto';
import { OutletFastPaymentStatusDto } from '../dtos/fast-payment-status.dto';
import { MerchantMetadataUpdatedDto } from '../dtos/merchant-metadata-dto';
import { MerchantOfferUpdatedDto } from '../dtos/merchant-offer-updated-dto';
import { MerchantStatusUpdatedDto } from '../dtos/merchant-status-dto';
import { CloneOfferDto, OutletOfferUpdatedDto } from '../dtos/outlet-offer-updated-dto';
import { UploadOutletStatusDto } from '../dtos/update-status-dto';
import { OutletSourceEnum } from '../enums/outlet-source-enum';
import { OutletFastPaymentStatusEnum, OutletStatusEnum } from '../enums/outlet-status-enum';
import { OutletAddress } from '../models/outlet-address.model';
import { Merchant } from 'src/merchant/entities/merchant.model';
import { Outlet } from '../models/outlet.model';
import { FastPaymentServiceProxy } from '../proxies/fast-payment-service.proxy';
import { OutletOfferProxy } from '../proxies/outlet-offer.proxy';
import { OutletGetService } from './outlet-get.service';
import { OutletHelperService } from './outlet-helper.service';
import { OutletProfileMappingService } from './outlet-profile-mapping.service';
import { ProfileService } from './profile.service';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';
import { ProfileEnum } from '../enums/profile-enum';
import { OutletProfileService } from 'src/outlet-profile/services/outlet-profile.service';
import { OutletProfileMetadata } from 'src/outlet-profile/entities/outlet-profile.model';
import { OutletProfileStatusEnum } from 'src/outlet-profile/enums/outlet-profile-enum';
import { Area } from 'src/area/models/area.model';
import { mainFilePayloadMapper } from '../mapper/main-file-payload.mapper';
import { Neighbourhood } from 'src/neighbourhood/models/neighbourhood.model';
import { Profile } from '../models/profile.model';
import { createOutletMapper } from '../mapper/outlet.mapper';
import { OutletPhotoService } from './outlet-photo.service';
import { OutletAuditFinanceService } from './outlet-audit-finance.service';
import { OutletCoreSyncService } from './outlet-core-sync.service';
import { OutletCustomCrudService } from './outlet-custom-crud.service';
import { OutletStatusService } from './outlet-status.service';

@Injectable()
export class OutletService {
  private readonly serviceName = 'OutletService';

  constructor(
    @InjectModel(Outlet)
    private readonly outletModel: typeof Outlet,
    private readonly outletFilterService: OutletFilterService,
    @Inject(forwardRef(() => OutletGetService)) private readonly outletGetService: OutletGetService,
    private readonly outletHelperService: OutletHelperService,
    private readonly outletOfferProxy: OutletOfferProxy,
    private readonly fastPaymentServiceProxy: FastPaymentServiceProxy,
    private readonly outletProfileMappingService: OutletProfileMappingService,
    private readonly profileService: ProfileService,
    private readonly logger: CustomPinoLogger,
    @Inject(forwardRef(() => MerchantService)) private readonly merchantService: MerchantService,
    @Inject(forwardRef(() => OutletProfileService))
    private readonly outletProfileService: OutletProfileService,
    private readonly outletPhotoService: OutletPhotoService,
    private readonly outletCustomCrudService: OutletCustomCrudService,
    private readonly outletStatusService: OutletStatusService,
    private readonly outletCoreSyncService: OutletCoreSyncService,
    private readonly outletAuditFinanceService: OutletAuditFinanceService
  ) {}

  async addEditCustomOutlet(
    data: CreateCustomOutletDto,
    transaction: Transaction,
    token: Record<string, string>,
    userId: string
  ): Promise<Outlet> {
    return this.outletCustomCrudService.addEditCustomOutlet(data, transaction, token, userId);
  }

  async cloneOutlet(
    outletId: string,
    userId: string,
    token: Record<string, string>,
    transaction: Transaction
  ): Promise<{ newOutlet: Outlet; oldOutletName: string }> {
    const methodName = 'cloneOutlet';
    this.logger.info(`${this.serviceName}.${methodName} - starts with outletId: ${outletId}`, { userId, token });
    try {
      const originalOutlet = await this.outletGetService.getOutletWithIdRaw(outletId);
      if (originalOutlet.hasClone) {
        throw new HttpException('Outlet already has a clone. Cannot clone again', HttpStatus.BAD_REQUEST);
      }
      const payload = createOutletMapper(originalOutlet, userId);

      const newOutlet = await this.outletModel.create(payload);
      const body: OutletFastPaymentStatusDto = {
        outletId: newOutlet.outletId,
        merchantId: newOutlet.merchantId,
        name: newOutlet.name,
        status: newOutlet.fastPaymentStatus,
      };
      const promises: Promise<unknown>[] = [this.fastPaymentServiceProxy.upsertFastPaymentStatus(body, token)];
      await this.outletFilterService.addClonedOutletFilters(newOutlet.outletId, transaction, userId, outletId);
      await this.outletPhotoService.cloneOutletPhotos(outletId, newOutlet.outletId, transaction);
      await Promise.all(promises);
      return { newOutlet, oldOutletName: originalOutlet.name };
    } catch (error) {
      this.logger.error(`${this.serviceName}.${methodName} - exception`, { error });
      throw new HttpException(
        error?.response?.data?.message ?? error?.message ?? 'Error in creating outlet clone',
        error?.response?.status ?? error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async markAsHasClone(outletId: string): Promise<void> {
    const methodName = 'markAsHasClone';
    this.logger.info(`${this.serviceName}.${methodName} - starts with outletId: ${outletId}`);
    try {
      await this.outletModel.update({ hasClone: true }, { where: { outletId } });
    } catch (error) {
      this.logger.error(`${this.serviceName}.${methodName} - exception`, { error });
      throw new HttpException(
        error?.response?.data?.message ?? error?.message ?? 'Error in marking outlet as has clone',
        error?.response?.status ?? error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async updateMaxOffer(
    offers: { outletId: string; consumerSplitValue: number; hasCustomOffer: boolean; profileId: string }[]
  ): Promise<void> {
    try {
      for (const offer of offers) {
        const { outletId, consumerSplitValue, hasCustomOffer, profileId } = offer;
        if (offer.outletId && offer.consumerSplitValue !== undefined) {
          if (profileId === process.env[EnvKeysEnum.MIMOJO_PROFILE_ID]) {
            await this.outletModel.update(
              { maxOffer: offer.consumerSplitValue, hasCustomOffer: offer.hasCustomOffer },
              { where: { outletId: offer.outletId } }
            );
          }
          await this.outletProfileService.updateOfferDetails(outletId, consumerSplitValue, hasCustomOffer, profileId);
        }
      }
    } catch (error) {
      this.logger.error(`${this.serviceName}.updateMaxOffer - error updating max value in outlet`, { error });
      throw error;
    }
  }

  createOffer(merchantId: string, outletId: string, outletName: string, userId: string): void {
    this.outletOfferProxy.createOutletDefaultOffers(merchantId, outletId, outletName, userId);
  }

  cloneOffer(payload: CloneOfferDto): void {
    this.logger.info(`${this.serviceName}.cloneOffer - pushing outlet details to offer`);
    this.outletOfferProxy.cloneDefaultOffer(payload);
  }

  async insertOutletFromPoi(
    data: CreateOutletDto,
    transaction: Transaction,
    token: Record<string, string>,
    userId: string
  ): Promise<Outlet> {
    const merchantMetadata = await this.merchantService.getMerchantById(data.merchantId);
    const merchantName = merchantMetadata?.name;
    const merchantNameAr = merchantMetadata?.nameAr ?? merchantName;
    const merchantLogo = merchantMetadata?.imageUrl;
    const merchantDesc = merchantMetadata?.desc;
    const merchantDescAr = merchantMetadata?.descAr ?? merchantDesc;
    const merchantArtDesc = merchantMetadata?.artDesc ?? [];
    const merchantCompDesc = merchantMetadata?.competitorDesc ?? [];
    const outletName = data.name ? data.name : null;
    const outletStatus =
      merchantMetadata?.status === 'NOT ENROLLED' ? OutletStatusEnum['Not Enrolled'] : OutletStatusEnum.Pending;
    const fastPaymentStatus =
      merchantMetadata?.fastPaymentStatus === 'NOT ENROLLED'
        ? OutletFastPaymentStatusEnum['NOT ENROLLED']
        : OutletFastPaymentStatusEnum.PENDING;
    let merchantPreferencesFilter: CustomOutletFiltersDto[] = [];
    merchantPreferencesFilter = this.outletHelperService.mapFilterDto(merchantPreferencesFilter, merchantMetadata);
    const jsonArray = data.midPidRelation?.map(ids => JSON.parse(JSON.stringify(ids)));
    const outlet = await this.outletModel.create(
      {
        merchantId: data.merchantId,
        name: outletName?.trim(),
        nameAr: data.nameAr?.trim() ?? outletName,
        merchantName: merchantName.trim(),
        merchantNameAr: merchantNameAr.trim(),
        merchantLogoUrl: merchantLogo,
        rating: data.rating ?? 0,
        priceLevel: data.priceLevel ?? 0,
        website: data.website?.trim(),
        websiteAr: data.websiteAr?.trim(),
        formattedPhoneNumber: data.formattedPhoneNumber?.trim(),
        businessStatus: data.businessStatus?.trim(),
        userRatingsTotal: data.userRatingsTotal,
        merchantIdsManual: data.merchantIdsManual,
        posIds: data.posIds,
        description: merchantDesc,
        descriptionAr: merchantDescAr,
        status: outletStatus,
        fastPaymentStatus,
        source: OutletSourceEnum.POI,
        menuUrl: data.menuUrl,
        menuUrlAr: data.menuUrlAr ?? data.menuUrl,
        bookingUrl: data.bookingUrl,
        bookingUrlAr: data.bookingUrlAr ?? data.bookingUrl,
        updatedBy: userId,
        checkTerminal: data.checkTerminal,
        midPidRelation: jsonArray,
        artDesc: merchantArtDesc,
        competitorDesc: merchantCompDesc,
      },
      { transaction }
    );
    const body: OutletFastPaymentStatusDto = {
      outletId: outlet.outletId,
      merchantId: data.merchantId,
      name: outletName,
      menuLink: data.menuUrl,
      status: fastPaymentStatus,
    };
    await this.fastPaymentServiceProxy.upsertFastPaymentStatus(body, token);
    await this.outletFilterService.addOutletFilters(outlet.outletId, merchantPreferencesFilter, transaction, userId);
    await this.outletCoreSyncService.updateCoreMerchantOutlet(
      merchantMetadata,
      data.merchantId,
      outlet.outletId,
      merchantName,
      outletName,
      merchantLogo,
      null,
      null,
      token,
      data?.outletAddress?.location
    );
    return outlet;
  }

  async syncPoiOutletToCore(outlet: Outlet, data: CreateOutletDto, token: Record<string, string>): Promise<void> {
    await this.outletCoreSyncService.syncPoiOutletToCore(outlet, data, token);
  }

  async syncCustomOutletToCore(outlet: Outlet, data: CreateCustomOutletDto, token: Record<string, string>): Promise<void> {
    await this.outletCoreSyncService.syncCustomOutletToCore(outlet, data, token);
  }

  async validateAndUpdateOutletStatus(
    data: UploadOutletStatusDto,
    token: Record<string, string>,
    userId: string
  ): Promise<Outlet> {
    return this.outletStatusService.validateAndUpdateOutletStatus(data, token, userId, this.buildOutletStatusSideEffects());
  }

  async validateAndUpdateOutletStatusRewardEngine(
    data: UploadOutletStatusDto,
    token: Record<string, string>,
    userId: string
  ): Promise<Outlet> {
    return this.outletStatusService.validateAndUpdateOutletStatusRewardEngine(
      data,
      token,
      userId,
      this.buildOutletStatusSideEffects()
    );
  }

  private buildOutletStatusSideEffects() {
    return {
      pushOutletToFinance: (merchantId, outletDetails, city, t) =>
        this.outletAuditFinanceService.pushOutletToFinance(merchantId, outletDetails, city, t),
      pushOutletActiveStatusToKafka: (merchantId, outletId, profileId) =>
        this.outletAuditFinanceService.pushOutletActiveStatusToKafka(merchantId, outletId, profileId),
      pushNodeStatusToAuditLog: (request, response) =>
        this.outletAuditFinanceService.pushNodeStatusToAuditLog(request, response),
      updateOutletCountByMerchant: (merchantId: string) => this.updateOutletCountByMerchant(merchantId),
    };
  }

  async updateFastPaymentStatus(
    body: OutletFastPaymentStatusDto,
    headers: Record<string, string>,
    userId: string
  ): Promise<Outlet> {
    return this.outletStatusService.updateFastPaymentStatus(body, headers, userId);
  }

  async updateOutletCountByMerchant(merchantId: string): Promise<void> {
    const count = await this.outletGetService.getOutletActiveInactiveCount(merchantId);
    const dto: UpdateMerchantOutletsNumberDto = {
      activeOutletsNum: count.activeOutletsNum,
      inActiveOutletsNum: count.inActiveOutletNum,
    };
    await this.merchantService.updateMerchantOutletsNumber(merchantId, dto);
  }

  async updateMerchantOutletMaxOffer(
    data: MerchantOfferUpdatedDto,
    transaction: Transaction,
    userId: string
  ): Promise<ReturnType<typeof baseResponseHelper>> {
    const [rowsAffected, [updatedOutlet]] = await this.outletModel.update(
      { maxOffer: data.maxOffer, updatedBy: userId },
      {
        where: { merchantId: data.merchantId },
        returning: true,
        transaction,
      }
    );
    if (rowsAffected === 0) {
      const response = baseResponseHelper(`Merchant with id ${data.merchantId} is not found`);
      response.message = 'Error';
      response.statusCode = HttpStatusCode.NotFound;
      return response;
    }
    return baseResponseHelper(updatedOutlet);
  }

  async updateOutletMaxOffer(data: OutletOfferUpdatedDto, userId: string): Promise<void> {
    const updateFields: Record<string, unknown> = {
      updatedBy: userId,
    };
    if (data.maxOffer) {
      updateFields.maxOffer = data.maxOffer;
    }
    if (data.hasCustomOffer != null) {
      updateFields.hasCustomOffer = data.hasCustomOffer;
    }
    if (data.profileId === process.env[EnvKeysEnum.MIMOJO_PROFILE_ID]) {
      await this.outletModel.update(updateFields, {
        where: { outletId: { [Op.in]: data.outletIds } },
      });
    }
    await this.outletProfileService.updateOutletOffer(updateFields, data.outletIds, data.profileId);
  }

  async updateMerchantMetadataToOutlet(
    data: MerchantMetadataUpdatedDto,
    transaction: Transaction,
    userId: string,
    token?: Record<string, string>
  ): Promise<void> {
    if (data?.merchantName) {
      await this.outletHelperService.updateOutletMerchantName(data, transaction, userId);
    }
    if (data?.merchantLogoUrl) {
      await this.outletHelperService.updateOutletMerchantLogo(data, transaction, userId);
    }
    if (data?.desc) {
      await this.outletHelperService.updateOutletMerchantDesc(data, transaction, userId);
    }
    if (data?.artDesc) {
      await this.outletHelperService.updateOutletArtDesc(data, transaction, userId);
    }
    if (data?.competitorDesc) {
      await this.outletHelperService.updateOutletCompetitorDesc(data, transaction, userId);
    }

    const outlets = await this.outletGetService.getAllOutletsByMerchantId(data?.merchantId);
    await this.outletFilterService.handleOutletNotCustomizedFiltersChange(
      data,
      transaction,
      outlets?.map(o => o.outletId),
      userId
    );

    try {
      const merchantMetadata = await this.merchantService.getMerchantById(data.merchantId);
      const updatePromises = outlets.map(outlet =>
        this.outletCoreSyncService.updateCoreMerchantOutlet(
          merchantMetadata,
          data.merchantId,
          outlet.outletId,
          merchantMetadata?.['name'] ?? null,
          outlet.name,
          data?.merchantLogoUrl ?? null,
          merchantMetadata?.['country'] ?? null,
          outlet?.outletAddress?.areaId ?? null,
          token,
          outlet?.outletAddress?.location ?? null,
          merchantMetadata?.['nameAr'] ?? null,
          outlet.nameAr ?? null
        )
      );
      await Promise.all(updatePromises);
    } catch (error) {
      this.logger.error('Error updating merchant metadata to outlet', { error });
    }
  }

  async updateOutletsStatus(
    data: MerchantStatusUpdatedDto,
    transaction: Transaction,
    token: Record<string, string>,
    userId: string
  ): Promise<void> {
    await this.outletStatusService.updateOutletsStatus(data, transaction, token, userId);
  }

  pushOutletToAuditLog(response: Record<string, unknown>, isGoogleOutlet: boolean, isNewOutlet: boolean): void {
    this.outletAuditFinanceService.pushOutletToAuditLog(response, isGoogleOutlet, isNewOutlet);
  }

  async pushNodeStatusToAuditLog(request: UploadOutletStatusDto, response: Outlet): Promise<void> {
    await this.outletAuditFinanceService.pushNodeStatusToAuditLog(request, response);
  }

  async getActiveOutletProfile(outletId: string, profileId: string, transactionDate: Date, bin: string) {
    return await this.outletProfileMappingService.findOneByTransactionDate(outletId, profileId, transactionDate, bin);
  }

  async getAllOutletsProfiles(outletId: string, transactionDate: Date): Promise<unknown> {
    const outletProfileMappingList = await this.outletProfileMappingService.findAllOutletsByTransactionDate(
      outletId,
      transactionDate
    );
    if (!outletProfileMappingList || outletProfileMappingList.length === 0) {
      return null;
    }
    return outletProfileMappingList;
  }

  async createOutletProfile(outletId: string, profileName: string, userId: string, merchantId?: string): Promise<void> {
    const [mimojoProfile, eibProfile] = await this.profileService.findByNames([profileName, ProfileEnum.EIB]);
    await this.outletProfileMappingService.create({
      outletId,
      profileId: mimojoProfile.id,
      isActive: true,
      startDate: null,
      endDate: null,
      updatedBy: userId,
    });
    await this.outletProfileMappingService.create({
      outletId,
      profileId: eibProfile.id,
      isActive: true,
      startDate: null,
      endDate: null,
      updatedBy: userId,
    });
    await this.outletProfileMappingService.insertToOutletProfileMetadata(outletId, mimojoProfile.id, merchantId);
    await this.outletProfileMappingService.insertToOutletProfileMetadata(outletId, eibProfile.id, merchantId);
  }

  async createOutletProfileClone(
    outletId: string,
    userId: string,
    existingOutletId: string,
    merchantId?: string
  ): Promise<void> {
    const methodName = 'createOutletProfileClone';
    this.logger.info(`${this.serviceName}.${methodName} - starts`, {
      outletId,
      userId,
      existingOutletId,
    });
    try {
      const [mimojoProfile, eibProfile] = await this.profileService.findByNames([ProfileEnum.MIMOJO, ProfileEnum.EIB]);
      await this.outletProfileMappingService.clone({
        outletId,
        profileId: mimojoProfile.id,
        existingOutletId,
        updatedBy: userId,
      });
      await this.outletProfileMappingService.clone({
        outletId,
        profileId: eibProfile.id,
        existingOutletId,
        updatedBy: userId,
      });
      await this.outletProfileMappingService.cloneToOutletProfileMetadata(
        outletId,
        mimojoProfile.id,
        merchantId,
        existingOutletId,
        userId
      );
      await this.outletProfileMappingService.cloneToOutletProfileMetadata(
        outletId,
        eibProfile.id,
        merchantId,
        existingOutletId,
        userId
      );
      this.logger.info(`${this.serviceName}.${methodName} - completed`);
    } catch (error) {
      this.logger.error(`${this.serviceName}.${methodName} - exception`, { error });
    }
  }

  async createOutletProfileById(outletId: string, profileId: string, userId: string): Promise<void> {
    await this.outletProfileMappingService.findOrCreate({
      outletId,
      profileId,
      isActive: true,
      startDate: null,
      endDate: null,
      updatedBy: userId,
    });
  }

  async getMerchantOutletDetails(): Promise<Record<string, unknown>[]> {
    const outlets = await this.outletModel.findAll({
      attributes: [
        'merchantId',
        [Sequelize.fn('MAX', Sequelize.fn('TRIM', Sequelize.col('merchant_name'))), 'merchantName'],
        [Sequelize.fn('COUNT', Sequelize.col('outlet_id')), 'totalOutletCount'],
        [Sequelize.fn('STRING_AGG', Sequelize.literal(`CONCAT(outlet_id, '::', name)`), '|||'), 'outletDetails'],
      ],
      group: ['merchantId'],
      raw: true,
    });

    return outlets.map(outlet => {
      const outletDetails = (outlet as unknown as { outletDetails: string; totalOutletCount: number }).outletDetails
        .split('|||')
        .map(detail => {
          const [outletId, outletName] = detail.split('::');
          return { outletId, outletName };
        });

      return {
        merchantId: outlet.merchantId,
        merchantName: outlet.merchantName,
        totalOutletCount: (outlet as unknown as { outletDetails: string; totalOutletCount: number }).totalOutletCount,
        outletDetails,
      };
    });
  }

  async findOutletsByIds(outletIds: string[]): Promise<Outlet[]> {
    this.logger.info(`OutletService.findOutletsByIds - starts with id count ${outletIds?.length}`);
    try {
      const outlets = await this.outletModel.findAll({
        where: { outletId: { [Op.in]: outletIds } },
        attributes: ['merchantId', 'outletId'],
        raw: true,
      });
      this.logger.info(`OutletService.findOutletsByIds - completed with count: ${outlets?.length}`);
      return outlets;
    } catch (error) {
      this.logger.error('OutletService.findOutletsByIds - exception', { error });
      throw error;
    }
  }

  async getActiveFabOutlets(): Promise<unknown[]> {
    this.logger.info('OutletService.getActiveFabOutlets - starts');
    try {
      const profile = await this.profileService.findByName(ProfileEnum.FAB);
      if (!profile) throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
      const profileId = profile.id;
      const apiDate = new Date();
      const outlets = await this.outletModel.findAll({
        where: { status: OutletStatusEnum.Active },
        attributes: ['website', 'formattedPhoneNumber', 'outletId', 'merchantId'],
        include: [
          {
            model: Profile,
            through: {
              attributes: [],
              where: {
                profileId,
                isActive: true,
                [Op.or]: [
                  { startDate: null, endDate: null },
                  { startDate: { [Op.lte]: apiDate }, endDate: null },
                  { startDate: null, endDate: { [Op.gte]: apiDate } },
                  { startDate: { [Op.lte]: apiDate }, endDate: { [Op.gte]: apiDate } },
                ],
              },
            },
            attributes: [],
            required: true,
          },
          {
            model: OutletAddress,
            where: { isActive: true },
            required: true,
            attributes: ['latitude', 'longitude', 'location'],
            include: [
              {
                model: Neighbourhood,
                attributes: ['neighbourhoodName'],
                include: [{ model: Area, attributes: ['areaName'] }],
              },
            ],
          },
          {
            model: OutletProfileMetadata,
            where: { profileId, status: OutletProfileStatusEnum.Active },
            attributes: ['outletId', 'merchantName', 'name', 'maxOffer', 'hasCustomOffer'],
            required: true,
          },
        ],
      });

      const merchantIds = [...new Set(outlets.map(o => o.merchantId))];
      const merchants = await this.merchantService.getActiveFabMerchants(merchantIds, profileId);

      const merchantMap = merchants.reduce(
        (acc, m) => {
          acc[m.id] = m;
          return acc;
        },
        {} as Record<string, Merchant>
      );

      const outletDetails = outlets
        .flatMap(o => {
          const merchant = merchantMap[o.merchantId];
          if (!merchant) return [];
          return [
            mainFilePayloadMapper({
              ...o.get({ plain: true }),
              merchant: merchant.get({ plain: true }),
            }),
          ];
        })
        .sort((a, b) => a.merchantName.localeCompare(b.merchantName, undefined, { sensitivity: 'base' }));

      this.logger.info('OutletService.getActiveFabOutlets - ends', {
        length: outletDetails.length,
      });
      return outletDetails;
    } catch (error) {
      this.logger.info('OutletService.getActiveFabOutlets - exception', { error });
      throw error;
    }
  }
}
