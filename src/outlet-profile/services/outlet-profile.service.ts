import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { OutletProfileMetadata } from '../entities/outlet-profile.model';
import { GetOutletDto } from 'src/outlet/dtos/get-outlet-dto';
import { Outlet } from 'src/outlet/models/outlet.model';
import { OutletAddress } from 'src/outlet/models/outlet-address.model';
import { Neighbourhood } from 'src/neighbourhood/models/neighbourhood.model';
import { Area } from 'src/area/models/area.model';
import { OutletOfferProxy } from 'src/outlet/proxies/outlet-offer.proxy';
import { CreateOutletProfileDto } from '../dtos/create-outlet-profile-metadata.dto';
import { OutletProfileStatusEnum } from '../enums/outlet-profile-enum';
import { OutletProfileFilterService } from './outlet-profile-filter.service';
import { MerchantProfileService } from 'src/merchant-profile/services/merchant-profile.service';
import { Op, Sequelize, Transaction, WhereOptions } from 'sequelize';
import { UpdateOutletProfileStatusDto } from '../dtos/update-outlet-profile-status.dto';
import { OutletGetService } from 'src/outlet/services/outlet-get.service';
import { HttpStatusCode } from 'axios';
import { OutletStatusEnum } from 'src/outlet/enums/outlet-status-enum';
import { OutletProfilePhotos } from '../entities/outlet-profile-photos';
import { OutletProfileFilters } from '../entities/outlet-profile-filters';
import { OpeningHours } from 'src/outlet/interfaces/opening-hours';
import { OutletTiming } from 'src/outlet/models/outlet-timing.model';
import { ErrorMessages } from 'src/errors/error-messages';
import { OutletProfileFiltersDto } from '../dtos/outlet-profile-filter.dto';
import { FastPaymentServiceProxy } from 'src/outlet/proxies/fast-payment-service.proxy';
import { PosServiceProxy } from 'src/outlet/proxies/pos-service.proxy';
import { OutletAddressService } from 'src/outlet/services/outlet-address.service';
import { MerchantService } from 'src/merchant/services/merchant.service';
import { IInternalApiConfig } from 'config/interface';
import { ConfigService } from '@nestjs/config';
import { applyOutletFilter, applyOutletSorting } from 'src/outlet/shared/outlet-filter.util';
import { buildOutletFastPaymentConfig, removeCircularReferences } from 'src/outlet/shared/outlet-fast-payment.util';
import {
  FILTER_WITH_CATEGORY_SUBCATEGORY_INCLUDE,
  FILTER_WITH_CATEGORY_SUBCATEGORY_INCLUDE_B2B,
} from 'src/outlet/shared/filter-category-subcategory-include';
import { OutletProfileMappingService } from 'src/outlet/services/outlet-profile-mapping.service';
import { ResetOutletProfileDto } from '../dtos/reset-outlet-profile.dto';
import { OutletPhotoService } from 'src/outlet/services/outlet-photo.service';
import { OutletProfilePhotosService } from './outlet-profile-photos.service';
import { getNextCopyName } from 'src/common/helpers/copy-name.helper';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';
import { RewardEngineWrapperProxy } from 'src/outlet/proxies/reward-engine-wrapper.proxy';
import { OutletProfileValidationStatusService } from './outlet-profile-validation-status.service';
import { EnvKeysEnum } from 'config/env.enum';

/** Read operations for outlet profile */
export interface IOutletProfileReadService {
  getOutletProfileMetadata(outletId: string, profileId: string, token: Record<string, string>): Promise<unknown>;
  getOutletProfileMetadataRewardEngine(outletId: string, profileId: string, token: Record<string, string>): Promise<unknown>;
  getOutletDetailsMetadata(outletId: string, profileId: string): Promise<unknown>;
  getProfileOutlets(
    merchantId: string,
    profileId: string,
    dto: GetOutletDto,
    token: Record<string, string>
  ): Promise<unknown>;
  getMerchantProfileOutlets(merchantId: string, profileId: string, token: Record<string, string>): Promise<unknown>;
  getOutletProfileActiveInactiveCount(merchantId: string, profileId: string): Promise<unknown>;
  findOutletsByIdandProfile(ids: string[], profileId: string): Promise<unknown>;
  findOutletProfilesForFilters(filterIds: string[], profileId: string): Promise<unknown>;
  getOutletStatusByProfileId(outletId: string, profileId: string): Promise<boolean>;
}

/** Write operations for outlet profile */
export interface IOutletProfileWriteService {
  updateMerchantProfileDataToOutletProfile(
    updateOutletProfileObj: unknown,
    merchantProfileFilters: unknown[],
    transaction: Transaction
  ): Promise<number>;
  createOrUpdateOutletProfileMetadata(dto: CreateOutletProfileDto, userId: string): Promise<unknown>;
  updateOutletProfileCountByMerchant(merchantId: string, profileId: string, transaction?: Transaction): Promise<void>;
  insertOutletProfileMetadata(
    outletId: string,
    profileId: string,
    merchantId: string,
    transaction?: Transaction
  ): Promise<void>;
  cloneOutletProfileMetadata(
    outletId: string,
    profileId: string,
    merchantId: string,
    existingOutletId: string,
    userId: string,
    transaction?: Transaction
  ): Promise<void>;
  resetOutletProfileDetails(dto: ResetOutletProfileDto, userId: string, token: Record<string, string>): Promise<unknown>;
  updateStatusForProfile(outletId: string, profileId: string, status: OutletProfileStatusEnum): Promise<unknown>;
  updateOfferDetails(outletId: string, maxOffer: number, hasCustomOffer: boolean, profileId: string): Promise<void>;
  updateOutletOffer(updateFields: Record<string, unknown>, outletIds: string[], profileId: string): Promise<unknown>;
  pushNodeStatusToAuditLog(request: UpdateOutletProfileStatusDto, response: OutletProfileMetadata): Promise<void>;
}

/** Validation and status update operations for outlet profile */
export interface IOutletProfileValidationService {
  validateAndUpdateOutletProfileStatus(
    dto: UpdateOutletProfileStatusDto,
    token: Record<string, string>,
    userId: string
  ): Promise<OutletProfileMetadata>;
  validateAndUpdateOutletProfileStatusRewardEngine(
    dto: UpdateOutletProfileStatusDto,
    token: Record<string, string>,
    userId: string
  ): Promise<OutletProfileMetadata>;
}

@Injectable()
export class OutletProfileService
  implements IOutletProfileReadService, IOutletProfileWriteService, IOutletProfileValidationService
{
  private readonly FoodAndDrinkCategoryId: string;
  private readonly fbCategoryTypeIds: string[];
  private mimojoProfileId: string;
  constructor(
    @InjectModel(OutletProfileMetadata) private readonly outletProfileModel: typeof OutletProfileMetadata,
    private readonly logger: CustomPinoLogger,
    private readonly outletOfferProxy: OutletOfferProxy,
    @Inject(forwardRef(() => MerchantProfileService)) private readonly merchantProfileService: MerchantProfileService,
    private readonly outletProfileFilterService: OutletProfileFilterService,
    @InjectConnection('default') private readonly sequelize: Sequelize,
    @Inject(forwardRef(() => OutletGetService)) private readonly outletGetService: OutletGetService,
    private readonly fastPaymentServiceProxy: FastPaymentServiceProxy,
    private readonly posServiceProxy: PosServiceProxy,
    private outletAddressService: OutletAddressService,
    @Inject(forwardRef(() => MerchantService)) private merchantService: MerchantService,
    private readonly configService: ConfigService,
    @InjectModel(Outlet) private readonly outletModel: typeof Outlet,
    @Inject(forwardRef(() => OutletProfileMappingService))
    private readonly outletProfileMappingService: OutletProfileMappingService,
    private readonly outletPhotosService: OutletPhotoService,
    private readonly outletProfilePhotoService: OutletProfilePhotosService,
    private readonly rewardEngineWrapperProxy: RewardEngineWrapperProxy,
    private readonly outletProfileValidationStatusService: OutletProfileValidationStatusService
  ) {
    const { FB_CATEGORY_ID, CATEGORY_TYPES, MIMOJO_PROFILE_ID } =
      this.configService.get<IInternalApiConfig>('internal-apis');
    this.FoodAndDrinkCategoryId = FB_CATEGORY_ID;
    this.fbCategoryTypeIds = CATEGORY_TYPES?.split(',');
    this.mimojoProfileId = MIMOJO_PROFILE_ID;
  }
  async getOutletProfileMetadata(outletId: string, profileId: string, token: Record<string, string>) {
    return this.getOutletProfileMetadataInternal(outletId, profileId, token, async () => {
      const offers = await this.outletOfferProxy.getOutletAllOffers(outletId, token, profileId);
      return offers?.data?.data ?? {};
    });
  }

  async getOutletProfileMetadataRewardEngine(outletId: string, profileId: string, token: Record<string, string>) {
    return this.getOutletProfileMetadataInternal(outletId, profileId, token, async () => {
      const offers = await this.rewardEngineWrapperProxy.getOutletAllRewards(outletId, token, profileId);
      return { offer: offers?.data?.data };
    });
  }

  private async getOutletProfileMetadataInternal(
    outletId: string,
    profileId: string,
    token: Record<string, string>,
    getOffers: () => Promise<Record<string, unknown>>
  ) {
    try {
      const outletProfile = await this.fetchOutletProfile(outletId, profileId);
      if (!outletProfile) return outletProfile;

      const { outletProfilePhotos, outletProfileFilters, ...rest } = this.flattenOutletProfile(outletProfile);
      this.normalizeOutletMetrics(rest);
      const [offers, additionalData] = await Promise.all([getOffers(), this.getAdditionalOutletData(outletId, token)]);
      const merged = {
        ...rest,
        outletPhotos: outletProfilePhotos,
        outletFilters: outletProfileFilters,
        ...offers,
        ...additionalData,
      };
      return this.removeCircularReferences(merged);
    } catch (error) {
      this.logger.error(`OutletProfileService.getOutletProfileMetadata`, { error });
      throw new HttpException('Failed to fetch outlet profile  metadata ', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async fetchOutletProfile(outletId: string, profileId: string) {
    return this.outletProfileModel.findOne({
      where: { outletId, profileId },
      attributes: [
        'id',
        'name',
        'nameAr',
        'merchantName',
        'merchantNameAr',
        'status',
        'description',
        'descriptionAr',
        'maxOffer',
        'merchantId',
      ],
      include: [
        {
          model: Outlet,
          required: true,
          attributes: [
            [Sequelize.literal('CAST(rating AS FLOAT)'), 'rating'],
            'outletId',
            'priceLevel',
            'website',
            'websiteAr',
            'formattedPhoneNumber',
            'businessStatus',
            'userRatingsTotal',
            'merchantIdsManual',
            'posIds',
            'source',
            'menuUrl',
            'menuUrlAr',
            'bookingUrl',
            'bookingUrlAr',
            'outletNo',
            'midPidRelation',
            'checkTerminal',
            'artDesc',
            'competitorDesc',
          ],
          include: [
            {
              model: OutletAddress,
              attributes: [
                ['outlet_address_id', 'id'],
                'googlePlaceId',
                'formattedAddress',
                'mapUrl',
                'latitude',
                'longitude',
                ['area_id', 'cityId'],
                'neighbourhoodId',
                'location',
                'locationAr',
              ],
              required: false,
              where: { isActive: true },
            },
            {
              model: OutletTiming,
              attributes: [['outlet_timing_id', 'id'], 'weekdayText', 'weekdayTextAr'],
              required: false,
              where: { isActive: true },
            },
          ],
        },
        {
          model: OutletProfilePhotos,
          attributes: ['id', 'cdnUrl', 'isDefault'],
          required: false,
          where: { isActive: true },
        },
        {
          model: OutletProfileFilters,
          attributes: ['id', 'isCustomized', 'included'],
          required: false,
          include: [FILTER_WITH_CATEGORY_SUBCATEGORY_INCLUDE],
        },
      ],
      order: [[{ model: OutletProfilePhotos, as: 'outletProfilePhotos' }, 'sort_order', 'ASC']],
    });
  }

  private flattenOutletProfile(outletProfile: OutletProfileMetadata) {
    const plain = outletProfile.get({ plain: true });
    if (plain.outlet) {
      Object.assign(plain, plain.outlet);
      delete plain.outlet;
    }

    return plain;
  }

  private normalizeOutletMetrics(outletProfile: Record<string, unknown>) {
    outletProfile.rating = outletProfile?.rating === 0 ? null : outletProfile?.rating;
    outletProfile.priceLevel = outletProfile?.priceLevel === 0 ? null : outletProfile?.priceLevel;
  }

  private async getAdditionalOutletData(outletId: string, token: Record<string, string>) {
    try {
      const [tabs, posConfig, priceConfig, config, outletConfig] = await Promise.all([
        this.fastPaymentServiceProxy.getOutletTabs(outletId, token),
        this.posServiceProxy.getPosConfig(outletId, token),
        this.fastPaymentServiceProxy.getOutletPriceConfig(outletId, token),
        this.fastPaymentServiceProxy.getOutlet(outletId, token),
        this.fastPaymentServiceProxy.getOutletConfig(outletId, token),
      ]);

      return buildOutletFastPaymentConfig({ tabs, posConfig, priceConfig, config, outletConfig });
    } catch (err) {
      this.logger.error(`FastPaymentServiceProxy error`, { error: err });
      return {};
    }
  }

  private removeCircularReferences(obj: unknown) {
    return removeCircularReferences(obj);
  }

  async getOutletDetailsMetadata(outletId: string, profileId: string) {
    let where = { outletId, profileId };
    if (profileId == process.env[EnvKeysEnum.ADIB_PROFILE_ID]) {
      where['status'] = 'Active';
    }
    let outletProfile = await OutletProfileMetadata.findOne({
      where,
      include: [
        {
          model: OutletProfilePhotos,
          as: 'outletProfilePhotos',
          required: false,
        },
        {
          model: OutletProfileFilters,
          as: 'outletProfileFilters',
          required: false,
          include: [FILTER_WITH_CATEGORY_SUBCATEGORY_INCLUDE_B2B],
        },
      ],
    });

    if (!outletProfile) {
      throw new HttpException(ErrorMessages.merchantProfile.notFound, HttpStatus.NOT_FOUND);
    }
    const [outlet, outletAddress, outletTiming] = await Promise.all([
      Outlet.findOne({
        where: { outletId },
        attributes: [
          'rating',
          ['price_level', 'priceLevel'],
          'website',
          ['formatted_phone_number', 'formattedPhoneNumber'],
          ['menu_url', 'menuUrl'],
          ['booking_url', 'bookingUrl'],
          ['has_custom_offer', 'hasCustomOffer'],
          ['user_ratings_total', 'userRatingsTotal'],
        ],
      }),
      OutletAddress.findOne({
        where: { outletId },
        attributes: [['formatted_address', 'formattedAddress']],
      }),
      OutletTiming.findOne({
        where: {
          outletId,
          isActive: true,
        },
        attributes: [['weekday_text', 'weekdayText']],
        order: [['updatedAt', 'DESC']],
      }),
    ]);

    const openingHours: OpeningHours[] =
      (outletTiming?.weekdayText as unknown as { day: string; time: string }[])?.map(entry => {
        const parsed = typeof entry === 'string' ? JSON.parse(entry) : entry;

        return {
          day: parsed.day,
          time: parsed.time?.split(',').map((t: string) => t.trim()) || [],
        };
      }) || [];

    // Combine additional details into outlet object
    const outletWithExtras = {
      ...outlet?.toJSON(),
      outletAddress,
      outletTiming: openingHours,
    };

    const result = {
      outletDetails: {
        ...outletProfile.toJSON(),
        nonMetaData: outletWithExtras,
      },
      outletProfilePhotos: outletProfile.outletProfilePhotos || [],
      outletProfileFilters: outletProfile.outletProfileFilters || [],
    };

    return result;
  }

  async updateMerchantProfileDataToOutletProfile(
    updateOutletProfileObj,
    merchantProfileFilters: unknown[],
    transaction: Transaction
  ) {
    try {
      this.logger.info('OutletProfileService.updateMerchantProfileDataToOutletProfile called');
      const [affectedRowsCount] = await this.outletProfileModel.update(
        {
          merchantName: updateOutletProfileObj.merchantName,
          merchantNameAr: updateOutletProfileObj.merchantNameAr,
          merchantLogoUrl: updateOutletProfileObj.merchantLogoUrl,
          description: updateOutletProfileObj.desc,
          descriptionAr: updateOutletProfileObj.descAr,
          isShariah: updateOutletProfileObj.isShariah,
        },
        {
          where: {
            merchantId: updateOutletProfileObj.merchantId,
            profileId: updateOutletProfileObj.profileId,
          },
        }
      );
      if (affectedRowsCount == 0) {
        this.logger.info(
          `There is no outlet profile found for this merchant ${updateOutletProfileObj.merchantId} and profile ${updateOutletProfileObj.profileId}`
        );
      }
      const outletProfileIds = await this.getOutletProfileIds(
        updateOutletProfileObj.merchantId,
        updateOutletProfileObj.profileId
      );
      await this.outletProfileFilterService.handleOutletProfileNotCustomizedFiltersChange(
        merchantProfileFilters as { filterId: string; MerchantProfileFilter?: { included?: boolean } }[],
        outletProfileIds,
        updateOutletProfileObj.updatedBy,
        transaction
      );

      return affectedRowsCount;
    } catch (error) {
      this.logger.error(`OutletProfileService.updateMerchantProfileDataToOutletProfile`, { error });
      throw new HttpException(
        'Failed to update  outlet profile  metadata with merchant profile data ',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getProfileOutlets(merchantId: string, profileId: string, dto: GetOutletDto, token: Record<string, string>) {
    try {
      let where: WhereOptions = { merchantId: merchantId };
      const mappedOutletDetails = await this.outletProfileMappingService.getMappedOutletDetails(profileId);
      const mappedOutletIds = mappedOutletDetails?.map(outlet => outlet?.outletId);
      if (dto.isMap) {
        where = {
          ...where,
          outlet_id: { [Op.in]: mappedOutletIds },
        };
      } else {
        where = {
          ...where,
          outlet_id: { [Op.notIn]: mappedOutletIds },
        };
      }
      const order: [string, string][] = [];
      this.applyFilter(dto, where);
      // Apply sorting
      this.applySorting(dto, order);
      const outlets = await this.outletModel.findAndCountAll({
        attributes: [['outlet_id', 'id'], 'name', 'status', 'fastPaymentStatus', 'createdAt', 'outletNo'],
        include: [
          {
            attributes: [],
            model: OutletAddress,
            required: false,
            include: [
              {
                attributes: [],
                model: Neighbourhood,
                required: false,
                include: [
                  {
                    attributes: ['area_name'],
                    model: Area,
                    required: false,
                  },
                ],
              },
            ],
            where: { is_active: true },
          },
          {
            model: OutletProfileMetadata,
            where: {
              profileId: profileId,
            },
            required: false,
            attributes: ['name', 'status', 'is_shariah', 'maxOffer', 'hasCustomOffer'],
          },
        ],
        where: where,
        order: order,
        offset: dto.pageIndex * dto.pageSize,
        limit: dto.pageSize,
      });
      if (outlets.count === 0) {
        return this.buildPaginatedProfileOutletsResponse(dto, outlets.count, outlets.rows);
      }
      let offers;
      try {
        offers = await this.outletOfferProxy.getAllOutletOffersByMerchantIdAndProfileId(merchantId, profileId, token);
      } catch (error) {
        this.logger.error('OutletProfileService.getProfileOutlets.getAllOutletOffersByMerchantId failed', { error });
      }
      const response = outlets.rows.map((outlet: Outlet) =>
        this.mapOutletToProfileOutletItem(outlet, profileId, mappedOutletDetails, offers)
      );
      return this.buildPaginatedProfileOutletsResponse(dto, outlets.count, response);
    } catch (error) {
      this.logger.error(`OutletProfileService.getProfileOutlets failed`, { error });
      throw new HttpException(
        error?.response ?? 'Failed to fetch profile outlet details',
        error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  async createOrUpdateOutletProfileMetadata(dto: CreateOutletProfileDto, userId: string) {
    let transaction: Transaction | undefined;
    try {
      const merchantProfileMetadata = await this.getMerchantProfileMetadataForOutletProfile(dto.merchantId, dto.profileId);
      const data = this.buildOutletProfileMerchantData(merchantProfileMetadata, dto);
      const outletProfileFilters: OutletProfileFiltersDto[] = dto?.outletFilters?.length
        ? dto.outletFilters
        : (merchantProfileMetadata?.filters as OutletProfileFiltersDto[]);

      transaction = await this.sequelize.transaction();
      const result = dto.id
        ? await this.updateOutletProfileMetadata(dto, transaction, data)
        : await this.createOutletProfileMetadata(dto, transaction, data);
      const outletId = dto.id ?? result.id;
      await this.outletProfileFilterService.addOutletProfileFilters(outletProfileFilters, outletId, transaction, userId);
      await transaction.commit();
      return result;
    } catch (error) {
      if (transaction) await transaction.rollback();
      this.logger.error('OutletProfileService.createOrUpdateOutletProfileMetadata failed', { error });
      throw new HttpException(
        error?.response ?? 'Failed to insert or update the outlet profile details',
        error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async getMerchantProfileMetadataForOutletProfile(
    merchantId: string,
    profileId: string
  ): Promise<Record<string, unknown>> {
    let metadata = await this.merchantProfileService.getMerchantProfileMetaData(merchantId, profileId);
    if (!metadata) {
      metadata = (await this.merchantService.getMerchantById(merchantId)) as unknown as Record<string, unknown>;
    }
    return metadata;
  }

  private buildOutletProfileMerchantData(
    merchantProfileMetadata: Record<string, unknown>,
    dto: CreateOutletProfileDto
  ): Record<string, unknown> {
    const merchantName = (merchantProfileMetadata?.name as string)?.trim();
    const merchantNameAr = (merchantProfileMetadata?.nameAr as string)?.trim() ?? merchantName;
    return {
      merchantName,
      merchantNameAr,
      merchantLogo: merchantProfileMetadata?.imageUrl,
      merchantDesc: merchantProfileMetadata?.desc,
      merchantDescAr: (merchantProfileMetadata?.descAr as string) ?? merchantProfileMetadata?.desc,
      outletName: dto.name,
      outletNameAr: dto.nameAr,
    };
  }
  async validateAndUpdateOutletProfileStatus(
    dto: UpdateOutletProfileStatusDto,
    token: Record<string, string>,
    userId: string
  ): Promise<OutletProfileMetadata> {
    return this.outletProfileValidationStatusService.validateAndUpdateOutletProfileStatus(
      dto,
      token,
      userId,
      (outletId, profileId, headers) =>
        this.getOutletProfileMetadata(outletId, profileId, headers) as Promise<Record<string, unknown>>,
      outletProfileDetails => this.validateOutletProfileOffer(outletProfileDetails),
      (merchantId, profileId, transaction) => this.updateOutletProfileCountByMerchant(merchantId, profileId, transaction)
    );
  }

  async validateAndUpdateOutletProfileStatusRewardEngine(
    dto: UpdateOutletProfileStatusDto,
    token: Record<string, string>,
    userId: string
  ): Promise<OutletProfileMetadata> {
    return this.outletProfileValidationStatusService.validateAndUpdateOutletProfileStatus(
      dto,
      token,
      userId,
      (outletId, profileId, headers) =>
        this.getOutletProfileMetadataRewardEngine(outletId, profileId, headers) as Promise<Record<string, unknown>>,
      outletProfileDetails => this.validateOutletProfileReward(outletProfileDetails),
      (merchantId, profileId, transaction) => this.updateOutletProfileCountByMerchant(merchantId, profileId, transaction)
    );
  }
  async getMerchantProfileOutlets(merchantId: string, profileId: string, token: Record<string, string>): Promise<unknown> {
    try {
      this.logger.info(
        `OutletProfileService.getMerchantProfileOutlets called with merchant id ${merchantId} and profile id ${profileId} `
      );
      const mappedOutletDetails = await this.outletProfileMappingService.getMappedOutletDetails(profileId);
      const mappedOutletIds = mappedOutletDetails?.map(outlet => outlet?.outletId);
      if (!mappedOutletIds?.length) return [];
      const response = await this.outletProfileModel.findAll({
        where: {
          merchantId: merchantId,
          profileId: profileId,
          outletId: { [Op.in]: mappedOutletIds },
        },
        attributes: ['id', 'merchantName', 'status', 'name', 'maxOffer'],
        include: [
          {
            attributes: [
              ['outlet_id', 'id'],
              'rating',
              'maxOffer',
              'userRatingsTotal',
              'hasCustomOffer',
              'fastPaymentStatus',
            ],
            model: Outlet,
            required: true,
            include: [
              {
                attributes: ['location'],
                model: OutletAddress,
                required: false,
                where: { is_active: true },
              },
            ],
          },
          {
            attributes: ['cdnUrl'],
            model: OutletProfilePhotos,
            required: false,
            where: { is_active: true, is_default: true },
          },
        ],
      });
      let offers;
      try {
        offers = await this.outletOfferProxy.getAllOutletOffersByMerchantIdAndProfileId(merchantId, profileId, token);
      } catch (error) {
        this.logger.error('OutletProfileService.getProfileOutlets.getAllOutletOffersByMerchantId failed', { error });
      }
      const formattedResponse = response.map(outletProfile => {
        const plainOutletProfile = outletProfile.get({ plain: true });
        const offer = this.formatOffers(offers, outletProfile.outlet);
        return {
          id: plainOutletProfile?.id,
          name: plainOutletProfile?.name,
          outletId: plainOutletProfile?.outlet?.id,
          merchantName: plainOutletProfile?.merchantName,
          rating: plainOutletProfile?.outlet?.rating,
          maxOffer: plainOutletProfile?.maxOffer,
          status: plainOutletProfile?.status,
          outletAddress: plainOutletProfile?.outlet?.outletAddress,
          outletPhotos: plainOutletProfile?.outletProfilePhotos,
          offers: offer,
          userRatingsTotal: plainOutletProfile?.outlet?.userRatingsTotal,
          fastPaymentStatus: plainOutletProfile?.outlet?.fastPaymentStatus,
          hasCustomOffer: plainOutletProfile?.outlet?.hasCustomOffer ?? false,
          location: plainOutletProfile?.outlet?.outletAddress?.location,
        };
      });
      return formattedResponse;
    } catch (error) {
      this.logger.error('OutletProfileService.getMerchantProfileOutlets failed', { error });
      throw new HttpException(`Failed to fetch the merchant outlet profile`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  private async createOutletProfileMetadata(
    dto: CreateOutletProfileDto,
    transaction: Transaction,
    data: Record<string, unknown>
  ) {
    const outletStatus = OutletProfileStatusEnum.Pending;
    const outletProfile = await this.outletProfileModel.create(
      {
        profileId: dto.profileId,
        outletId: dto.outletId,
        merchantId: dto.merchantId,
        name: data.outletName as string,
        status: outletStatus,
        merchantName: data?.merchantName as string,
        merchantNameAr: data?.merchantNameAr as string,
        merchantLogoUrl: data?.merchantLogoUrl as string,
        description: dto.description ? dto.description : (data.merchantDesc as string),
        descriptionAr: dto.descriptionAr ? dto.descriptionAr : (data.merchantDescAr as string),
      },
      { transaction }
    );
    return outletProfile;
  }
  private async updateOutletProfileMetadata(
    dto: CreateOutletProfileDto,
    transaction: Transaction,
    data: Record<string, unknown>
  ) {
    const [, updatedRows] = await this.outletProfileModel.update(
      {
        name: data?.outletName as string,
        nameAr: data?.outletNameAr as string,
        merchantName: data?.merchantName as string,
        merchantNameAr: data?.merchantNameAr as string,
        merchantLogoUrl: data?.merchantLogoUrl as string,
        description: dto?.description ?? (data.merchantDesc as string),
        descriptionAr: dto?.descriptionAr ?? (data.merchantDescAr as string),
      },
      {
        where: {
          id: dto.id,
        },
        transaction,
        returning: true,
      }
    );
    return updatedRows?.[0];
  }
  private applySorting(getOutletRequestDto: GetOutletDto, order: [string, string][]) {
    applyOutletSorting(getOutletRequestDto, order);
  }

  private applyFilter(getOutletRequestDto: GetOutletDto, where: WhereOptions) {
    applyOutletFilter(getOutletRequestDto, where);
  }

  private buildPaginatedProfileOutletsResponse(
    dto: GetOutletDto,
    totalCount: number,
    data: unknown[]
  ): { data: unknown[]; pagination: { page: number; pageCount: number; total: number; count: number } } {
    return {
      data,
      pagination: {
        page: dto.pageIndex,
        pageCount: Math.ceil(totalCount / dto.pageSize),
        total: totalCount,
        count: data.length,
      },
    };
  }

  private mapOutletToProfileOutletItem(
    outlet: Outlet,
    profileId: string,
    mappedOutletDetails: Array<{ outletId?: string; profileId?: string; startDate?: unknown; endDate?: unknown }>,
    offers: unknown
  ) {
    const offer = this.formatOffers(offers, outlet);
    const mappedOutlet = mappedOutletDetails?.find(
      m => m?.outletId === outlet?.dataValues?.id && m?.profileId === profileId
    );
    const profile = outlet?.profileOutlets?.[0];
    return {
      id: outlet.dataValues.id,
      name: profile?.name ?? outlet.name,
      status: profile?.status ?? OutletProfileStatusEnum.Pending,
      location: outlet?.outletAddress?.location,
      city: outlet?.outletAddress?.neighbourhood?.area?.areaName,
      fastPaymentStatus: outlet?.fastPaymentStatus,
      offers: offer,
      maxOffer: profile?.maxOffer ?? null,
      hasCustomOffer: profile?.hasCustomOffer ?? null,
      startDate: mappedOutlet?.startDate ?? null,
      endDate: mappedOutlet?.endDate ?? null,
      outletNo: outlet.outletNo,
    };
  }

  private formatOffers(offers, outlet: Outlet) {
    const blackoutDays = offers?.data?.data?.outletBlackOutdays?.filter(
      item => item?.merchantOutletProfile?.outletId === outlet?.dataValues?.id
    );

    // Filter merchantOutletsCustomHours by outlet ID
    const customHours = offers?.data?.data?.outletCustomHours?.filter(
      item => item?.merchantOutletProfile?.outletId === outlet?.dataValues?.id
    );

    // Filter merchantOutletsNormalOffer by outlet ID
    const normalOffer = offers?.data?.data?.outletNormalOffer?.filter(
      item => item?.merchantOutletProfile?.outletId === outlet?.dataValues?.id
    );

    // Filter merchantOutletsTieredOffer by outlet ID
    const tieredOffer = offers?.data?.data?.outletTieredOffers?.filter(
      item => item?.merchantOutletProfile?.outletId === outlet?.dataValues?.id
    );

    return {
      merchantOutletsBlackOutdays: blackoutDays,
      merchantOutletsCustomHours: customHours,
      merchantOutletsNormalOffer: normalOffer,
      merchantOutletTieredOffer: tieredOffer,
    };
  }
  protected async getOutletProfileIds(merchantId: string, profileId: string) {
    const outletProfiles = await this.outletProfileModel.findAll({
      where: {
        merchantId: merchantId,
        profileId: profileId,
      },
      attributes: ['id'],
    });
    const outletProfileIds = outletProfiles.map(of => of.id);
    return outletProfileIds;
  }

  private validateOutletProfileOffer(outletDetails: Record<string, unknown>) {
    const hasNoNormalOffer = outletDetails?.outletNormalOffer == null;
    const hasNoCustomHours =
      !outletDetails?.outletCustomHours || (outletDetails?.outletCustomHours as unknown[])?.length === 0;
    const hasNoTieredOffers = outletDetails?.outletTieredOffers == null;
    if (hasNoNormalOffer && hasNoCustomHours && hasNoTieredOffers) {
      throw new HttpException('Please create outlet profile offer!', HttpStatusCode.BadRequest);
    }
  }

  private validateOutletProfileReward(outletDetails: Record<string, unknown>) {
    if (!(outletDetails?.offer as { rules?: unknown[] })?.rules?.length) {
      throw new HttpException('Please create outlet profile offer!', HttpStatusCode.BadRequest);
    }
  }

  async updateOutletProfileCountByMerchant(merchantId: string, profileId: string, transaction?: Transaction) {
    const count = await this.getOutletProfileActiveInactiveCount(merchantId, profileId);
    const dto = {
      activeOutletsNum: count.activeOutletsNum,
      inActiveOutletsNum: count.inActiveOutletNum,
    };
    await this.merchantProfileService.updateMerchantProfileOutletsNumber(merchantId, profileId, dto, transaction);
  }

  async pushNodeStatusToAuditLog(request: UpdateOutletProfileStatusDto, response: OutletProfileMetadata): Promise<void> {
    this.outletProfileValidationStatusService.pushNodeStatusToAuditLog(request, response);
  }

  async getOutletProfileActiveInactiveCount(merchantId: string, profileId: string) {
    const activeCount = await this.outletProfileModel.count({
      where: {
        merchantId: merchantId,
        profileId: profileId,
        status: OutletStatusEnum.Active,
      },
    });
    const inactiveCount = await this.outletProfileModel.count({
      where: {
        merchantId: merchantId,
        profileId: profileId,
        status: {
          [Op.not]: OutletStatusEnum.Active,
        },
      },
    });

    return {
      activeOutletsNum: activeCount,
      inActiveOutletNum: inactiveCount,
    };
  }

  private formOutletName(merchantName: string, outletAddress: OutletAddress) {
    let outletName;
    outletName =
      merchantName?.trim() && outletAddress?.location?.trim()
        ? merchantName.trim() + ' - ' + outletAddress?.location.trim()
        : null;
    return outletName;
  }
  async insertOutletProfileMetadata(outletId: string, profileId: string, merchantId: string, transaction?: Transaction) {
    try {
      let merchantProfileMetadata = await this.merchantProfileService.getMerchantProfileMetaData(merchantId, profileId);
      if (!merchantProfileMetadata) {
        const merchant = await this.merchantService.getMerchantById(merchantId);
        merchantProfileMetadata = merchant.get({ plain: true }) as Record<string, unknown>;
      }
      const outletAddress = await this.outletAddressService.getOutletLocation(outletId);
      const outletName = this.formOutletName(merchantProfileMetadata.name as string, outletAddress);
      const outletNameAr = this.formOutletName(merchantProfileMetadata.nameAr as string, outletAddress);
      const [outletProfile, created] = await this.outletProfileModel.findOrCreate({
        where: {
          outletId: outletId,
          profileId: profileId,
        },
        defaults: {
          merchantId: merchantId,
          outletId: outletId,
          profileId: profileId,
          merchantName: (merchantProfileMetadata?.name as string)?.trim(),
          merchantNameAr: (merchantProfileMetadata?.nameAr as string)?.trim(),
          name: outletName,
          nameAr: outletNameAr,
          status: OutletProfileStatusEnum.Pending,
          description: merchantProfileMetadata?.desc as string,
          descriptionAr: merchantProfileMetadata?.descAr as string,
          merchantLogoUrl: merchantProfileMetadata?.merchantLogoUrl as string,
          isShariah: merchantProfileMetadata?.isShariah as boolean,
        },
        transaction,
      });
      if (created) {
        await this.outletProfileFilterService.addOutletProfileFilters(
          merchantProfileMetadata.filters as OutletProfileFiltersDto[],
          outletProfile.id,
          transaction
        );
        const outletPhotos = await this.outletPhotosService.find(outletId);
        if (outletPhotos?.length) {
          await this.outletProfilePhotoService.insertDefaultOutletImages(outletPhotos, outletProfile.id, transaction);
        }
      }
    } catch (error) {
      this.logger.error('OutletProfileService.insertOutletProfileMetadata failed', { error });
      throw new HttpException('Failed to insert the data to outletProfile', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async cloneOutletProfileMetadata(
    outletId: string,
    profileId: string,
    merchantId: string,
    existingOutletId: string,
    userId: string,
    transaction?: Transaction
  ) {
    try {
      let existingOutletProfileMetadata = await this.getOutletDetailsMetadata(existingOutletId, profileId);

      const [outletProfile, created] = await this.outletProfileModel.findOrCreate({
        where: {
          outletId: outletId,
          profileId: profileId,
        },
        defaults: {
          merchantId: merchantId,
          outletId: outletId,
          profileId: profileId,
          merchantName: existingOutletProfileMetadata?.outletDetails?.merchantName?.trim(),
          merchantNameAr: existingOutletProfileMetadata?.outletDetails?.merchantNameAr?.trim(),
          maxOffer: existingOutletProfileMetadata?.outletDetails?.maxOffer,
          updatedBy: userId,
          hasCustomOffer: existingOutletProfileMetadata?.outletDetails?.hasCustomOffer,
          // offerDescription: existingOutletProfileMetadata?.outletDetails?.offerDescription,
          name: getNextCopyName(existingOutletProfileMetadata?.outletDetails?.name),
          nameAr: getNextCopyName(
            existingOutletProfileMetadata?.outletDetails?.nameAr ?? existingOutletProfileMetadata?.outletDetails?.name
          ),
          status: OutletProfileStatusEnum.Pending,
          description: existingOutletProfileMetadata?.outletDetails?.description,
          descriptionAr: existingOutletProfileMetadata?.outletDetails?.descriptionAr,
          merchantLogoUrl: existingOutletProfileMetadata?.outletDetails?.merchantLogoUrl,
          isShariah: existingOutletProfileMetadata?.outletDetails?.isShariah,
        },
        transaction,
      });
      if (created) {
        await this.outletProfileFilterService.cloneOutletProfileFilters(
          existingOutletProfileMetadata?.outletProfileFilters,
          outletProfile.id,
          transaction
        );

        if (existingOutletProfileMetadata?.outletProfilePhotos?.length) {
          await this.outletProfilePhotoService.cloneProfileOutletImages(
            existingOutletProfileMetadata?.outletProfilePhotos,
            outletProfile.id,
            transaction
          );
        }
      }
    } catch (error) {
      this.logger.error('OutletProfileService.cloneOutletProfileMetadata failed', { error });
      throw new HttpException('Failed to clone the data to outletProfile', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async resetOutletProfileDetails(dto: ResetOutletProfileDto, userId: string, token: Record<string, string>) {
    try {
      let merchantProfileMetadata = await this.merchantProfileService.getMerchantProfileMetaData(
        dto.merchantId,
        dto.profileId
      );
      if (!merchantProfileMetadata) {
        const merchant = await this.merchantService.getMerchantById(dto.merchantId);
        merchantProfileMetadata = merchant.get({ plain: true }) as Record<string, unknown>;
      }
      const outletPhotos = await this.outletPhotosService.find(dto.outletId);
      const outletAddress = await this.outletAddressService.getOutletLocation(dto.outletId);
      const outletName = this.formOutletName(merchantProfileMetadata.name as string, outletAddress);
      const outletNameAr = this.formOutletName(merchantProfileMetadata.nameAr as string, outletAddress);
      await this.sequelize.transaction(async (transaction: Transaction) => {
        await this.outletProfileModel.update(
          {
            name: outletName,
            nameAr: outletNameAr,
            description: merchantProfileMetadata?.desc as string,
            descriptionAr: merchantProfileMetadata?.descAr as string,
          },
          {
            where: {
              id: dto.id,
            },
            transaction,
          }
        );
        await this.outletProfileFilterService.addOutletProfileFilters(
          merchantProfileMetadata.filters as OutletProfileFiltersDto[],
          dto.id,
          transaction,
          userId
        );
        await this.outletProfilePhotoService.deleteOutletProfilePhotosByOutletProfileId(dto.id, transaction);
        if (outletPhotos?.length) {
          await this.outletProfilePhotoService.insertDefaultOutletImages(outletPhotos, dto.id, transaction);
        }
      });
      const resetedData = await this.getOutletProfileMetadata(dto.outletId, dto.profileId, token);
      return resetedData;
    } catch (error) {
      this.logger.error('OutletProfileService.resetOutletProfileDetails failed', { error });
      throw new HttpException(
        error?.response ?? 'Failed to reset the outlet profile',
        error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async updateStatusForProfile(outletId: string, profileId: string, status: OutletProfileStatusEnum) {
    this.logger.info('OutletProfileService.updateStatusForProfile - starts', { outletId, profileId, status });
    try {
      const [affectedCount] = await this.outletProfileModel.update(
        { status },
        {
          where: {
            outletId,
            profileId,
          },
          returning: true,
        }
      );
      this.logger.info('OutletProfileService.updateStatusForProfile - ends ', { affectedCount });
    } catch (error) {
      this.logger.error('OutletProfileService.updateStatusForProfile - exception', { error, outletId, profileId });
    }
  }

  async findOutletsByIdandProfile(ids: string[], profileId: string) {
    this.logger.info('OutletProfileService.findOutletsByIdandProfile - starts', { ids, profileId });
    try {
      const outlets = await this.outletProfileModel.findAll({
        where: {
          id: { [Op.in]: ids },
          profileId,
          status: OutletProfileStatusEnum.Active,
        },
      });

      return outlets;
    } catch (error) {
      this.logger.error('OutletProfileService.findOutletsByIdandProfile - exception', { error });
    }
  }

  async findOutletProfilesForFilters(filterIds: string[], profileId: string) {
    this.logger.info('OutletProfileService.findOutletProfilesForFilters - starts', { filterIds, profileId });
    try {
      const outlets = await this.outletProfileModel.findAll({
        where: { profileId, status: OutletProfileStatusEnum.Active },
        attributes: ['outletId'],
        include: [
          {
            model: OutletProfileFilters,
            required: true,
            where: { filterId: { [Op.in]: filterIds } },
          },
        ],
      });

      return outlets;
    } catch (error) {
      this.logger.error('OutletProfileService.findOutletProfilesForFilters - exception', { error });
    }
  }

  async updateOfferDetails(outletId: string, maxOffer: number, hasCustomOffer: boolean, profileId: string) {
    this.logger.info('OutletProfileService.updateOfferDetails - starts', { outletId, maxOffer, hasCustomOffer, profileId });
    try {
      await this.outletProfileModel.update(
        { maxOffer, hasCustomOffer },
        {
          where: { outletId, profileId },
        }
      );
    } catch (error) {
      this.logger.error('OutletProfileService.updateOfferDetails - exception', { error });
    }
  }

  async updateOutletOffer(updateFields: Record<string, unknown>, outletIds: string[], profileId: string) {
    try {
      await this.outletProfileModel.update(updateFields, {
        where: {
          outletId: { [Op.in]: outletIds },
          profileId,
        },
      });
    } catch (error) {
      this.logger.error('OutletProfileService.updateOutletOffer - exception', { error });
    }
  }

  async getOutletStatusByProfileId(outletId: string, profileId: string): Promise<boolean> {
    try {
      this.logger.info(
        `OutletProfileService.getOutletStatusByProfileId called with outlet id ${outletId} and profile id ${profileId}`
      );
      const outletProfile = await this.outletProfileModel.findOne({
        where: {
          outletId,
          profileId,
        },
      });
      if (!outletProfile) {
        throw new HttpException(ErrorMessages.common.entityNotFound('Outlet Profile'), HttpStatus.NOT_FOUND);
      }
      const status = outletProfile?.status === OutletProfileStatusEnum.Active;
      this.logger.info('OutletProfileService.getOutletStatusByProfileId completed', { status });
      return status;
    } catch (error) {
      this.logger.error('OutletProfileService.getOutletStatusByProfileId - exception ', { error });
      throw new HttpException(
        error?.response ?? 'Failed to fetch the outlet profile ',
        error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
