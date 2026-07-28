import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { MerchantProfileMetadataDto } from '../dtos/create-merchant-profile-data.dto';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { MerchantProfileMetadata } from '../entities/merchant-profile-metadata.model';
import { ErrorMessages } from 'src/errors/error-messages';
import { MerchantProfileFiltersService } from 'src/merchant-profile-filters/services/merchant-profile-filters.service';
import { Filter } from 'src/filters/models/filter.model';
import { MerchantProfileStatusEnum } from '../enums/merchant-profile-status-enum';
import { MerchantProfilePhoto } from '../entities/merchant-profile-photo.entity';
import { Category } from 'src/category/models/category.model';
import { SubCategory } from 'src/sub-category/models/sub-category.model';
import { GetMerchantsDto } from '../dtos/get-merchants-profile.dto';
import { Op, Sequelize, Transaction } from 'sequelize';
import { OutletProfileService } from 'src/outlet-profile/services/outlet-profile.service';
import { CoordinateDto } from '../dtos/coordinate.dto';
import { OutletAddress } from 'src/outlet/models/outlet-address.model';
import { OutletProfileMetadata } from 'src/outlet-profile/entities/outlet-profile.model';
import { DistanceRequestDto } from 'src/distance/dtos/distance-req-dto';
import { DistanceService } from 'src/distance/services/distance.service';
import { Outlet } from 'src/outlet/models/outlet.model';
import { GenericHttpService } from 'src/http/generic-http.service';
import { EnvKeysEnum } from 'config/env.enum';
import { Merchant } from 'src/merchant/entities/merchant.model';
import { MERCHANT_DETAILS_FILTER_INCLUDE } from 'src/merchant/constants/merchant-details-filter-include';
import { UpdateMerchantProfileOutletsNumberDto } from '../dtos/update-merchant-profile-outlets-number.dto';
import { MerchantStatusEnum } from 'src/merchant/enums/merchant-status.enum';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';
import { OutletProfileMapping } from 'src/outlet/models/outlet-profile-mapping.model';
import { ConfigService } from '@nestjs/config';
import { IAppConfig } from 'config/interface';
import { RewardEngineWrapperProxy } from 'src/outlet/proxies/reward-engine-wrapper.proxy';

/** Read operations for merchant profile */
export interface IMerchantProfileReadService {
  getMerchants(profileId: string, dto: GetMerchantsDto): Promise<unknown>;
  getMerchantDetails(merchantId: string, profileId: string, coordinate?: CoordinateDto): Promise<MerchantProfileMetadata>;
  getMerchantProfileMetaData(merchantId: string, profileId: string): Promise<Record<string, unknown> | null>;
  getMerchantProfilePhotos(merchantProfileId: string): Promise<unknown>;
  getCoreMerchantAccountConfiguration(id: string): Promise<unknown>;
  getMerchantStatusByProfileId(merchantId: string, profileId: string): Promise<boolean>;
}

/** Write operations for merchant profile */
export interface IMerchantProfileWriteService {
  createOrUpdateMerchantProfileData(dto: MerchantProfileMetadataDto, updatedBy: string): Promise<MerchantProfileMetadata>;
  updateMerchantProfileMetaDataStatus(
    merchantId: string,
    profileId: string,
    status: MerchantProfileStatusEnum,
    updatedBy: string
  ): Promise<boolean>;
  deleteMerchantProfilePhotoById(photoId: string): Promise<{ deleted: boolean }>;
  updateMerchantProfileOutletsNumber(
    merchantId: string,
    profileId: string,
    body: UpdateMerchantProfileOutletsNumberDto,
    transaction: Transaction
  ): Promise<void>;
  updateMerchantProfileCustomOffer(
    merchantId: string,
    profileId: string,
    hasCustomOffer: boolean,
    maxOfferValue: number
  ): Promise<void>;
}

/** Validation for merchant profile activation */
export interface IMerchantProfileValidationService {
  canActivateMerchantProfile(merchantProfile: MerchantProfileMetadata, isCloNeeded: boolean): boolean;
}

@Injectable()
export class MerchantProfileService
  implements IMerchantProfileReadService, IMerchantProfileWriteService, IMerchantProfileValidationService
{
  private readonly isRewardEngineEnabled: boolean;
  constructor(
    @InjectModel(MerchantProfileMetadata) private merchantProfileMetadataModel: typeof MerchantProfileMetadata,
    @InjectModel(MerchantProfilePhoto) private merchantProfilePhotoModel: typeof MerchantProfilePhoto,
    private readonly logger: CustomPinoLogger,
    private readonly merchantProfileFilterService: MerchantProfileFiltersService,
    @InjectModel(OutletProfileMetadata) private readonly outletProfileMetadataModel: typeof OutletProfileMetadata,
    @InjectModel(OutletAddress) private readonly outletAddressModel: typeof OutletAddress,
    @Inject(forwardRef(() => OutletProfileService)) private readonly outletProfileService: OutletProfileService,
    private readonly distanceService: DistanceService,
    @InjectConnection('default') private readonly sequelize: Sequelize,
    private readonly httpService: GenericHttpService,
    @InjectModel(OutletProfileMapping) private readonly outletProfileMappingModel: typeof OutletProfileMapping,
    private readonly configService: ConfigService,
    private readonly rewardEngineWrapperProxy: RewardEngineWrapperProxy
  ) {
    const { IS_REWARD_ENGINE_ENABLED } = this.configService.get<IAppConfig>('app');
    this.isRewardEngineEnabled = IS_REWARD_ENGINE_ENABLED;
  }
  async createOrUpdateMerchantProfileData(
    dto: MerchantProfileMetadataDto,
    updatedBy: string
  ): Promise<MerchantProfileMetadata> {
    try {
      const { merchantId, profileId } = dto;
      const existing = await this.merchantProfileMetadataModel.findOne({
        where: { merchantId, profileId },
      });
      let result: MerchantProfileMetadata;
      let merchantProfileId: string;
      let updatedMerchantProfile;
      await this.sequelize.transaction(async (transaction: Transaction) => {
        if (existing) {
          result = await existing.update(
            {
              name: dto.name,
              nameAr: dto.nameAr ?? dto.name,
              desc: dto.desc,
              descAr: dto.descAr ?? dto.desc,
              imageUrl: dto.imageUrl,
              isShariah: dto?.isShariah ?? false,
            },
            { returning: true, transaction }
          );

          merchantProfileId = existing.id;
          this.logger.info('merchantProfileService.createOrUpdateMerchantProfileData updated');
        } else {
          const rewardEngineOfferSnapshot = this.isRewardEngineEnabled
            ? await this.getMerchantOfferSnapshotFromRewardEngine(merchantId, profileId)
            : {};
          result = await this.merchantProfileMetadataModel.create(
            {
              name: dto.name,
              nameAr: dto.nameAr ?? dto.name,
              desc: dto.desc,
              descAr: dto.descAr ?? dto.desc,
              imageUrl: dto.imageUrl,
              merchantId: dto.merchantId,
              profileId: dto.profileId,
              isShariah: dto?.isShariah,
              ...rewardEngineOfferSnapshot,
            },
            { transaction }
          );
          merchantProfileId = result.id;
          this.logger.info('merchantProfileService.createOrUpdateMerchantProfileData created');
        }
        if (dto.salesPerson) {
          await this.merchantProfileMetadataModel.sequelize.models.Merchant.update(
            { salesPerson: dto.salesPerson },
            { where: { id: dto.merchantId }, transaction }
          );
        }
        await this.merchantProfileFilterService.updateMerchantProfileFilters(dto, merchantProfileId, updatedBy, transaction);
      });
      updatedMerchantProfile = await result.reload({
        include: [
          {
            through: { attributes: ['included'] },
            model: Filter,
            attributes: ['filterId'],
            as: 'filters',
          },
        ],
      });
      const merchantProfileOutletProfileDto = {
        merchantName: dto.name,
        merchantNameAr: dto.nameAr ?? dto.name,
        merchantLogoUrl: dto.imageUrl,
        desc: dto.desc,
        descAr: dto.descAr,
        merchantId: merchantId,
        profileId: profileId,
        isShariah: dto?.isShariah,
        updatedBy: updatedBy,
      };
      await this.sequelize.transaction(async (transaction: Transaction) => {
        await this.outletProfileService.updateMerchantProfileDataToOutletProfile(
          merchantProfileOutletProfileDto,
          updatedMerchantProfile.filters,
          transaction
        );
      });
      this.logger.info(`merchantProfileService.createOrUpdateMerchantProfileData completed`, { updatedMerchantProfile });
      return updatedMerchantProfile;
    } catch (error) {
      this.logger.error('merchantProfileService.createOrUpdateMerchantProfileData failed', { error });
      throw new HttpException(
        error?.response ?? 'Failed to create or update merchant profile metadata',
        error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async getMerchantOfferSnapshotFromRewardEngine(merchantId: string, profileId: string) {
    const currentReward = await this.rewardEngineWrapperProxy.getMerchantCurrentRewardByProfile(merchantId, profileId);
    const metadata = currentReward?.metadata;
    const parsedMaxOfferValue = Number(metadata?.maxOfferValue);
    if (!Number.isFinite(parsedMaxOfferValue) || typeof metadata?.hasCustomOffer !== 'boolean') {
      return {};
    }

    return {
      maxOfferValue: parsedMaxOfferValue,
      hasCustomOffer: metadata.hasCustomOffer,
    };
  }

  async getMerchants(
    profileId: string,
    dto: GetMerchantsDto
  ): Promise<{
    data: MerchantProfileMetadata[];
    pagination: {
      page: number;
      pageCount: number;
      total: number;
      count: number;
    };
  }> {
    try {
      const { pageIndex, pageSize, categoryIds, cityId, search } = dto;
      const offset = (pageIndex - 1) * pageSize;

      let baseWhereClause = { profileId, status: 'ACTIVE' };
      if (search) {
        baseWhereClause[Op.or] = [{ name: { [Op.iLike]: `%${search}%` } }];
      }

      const includeFilters: Record<string, unknown>[] = [
        {
          model: Filter,
          through: { where: { included: true }, attributes: [] },
          include: [
            { model: Category, as: 'category', attributes: ['name'] },
            { model: SubCategory, as: 'subCategory', attributes: ['name'] },
          ],
        },
        {
          model: MerchantProfilePhoto,
          attributes: [['cdn_url', 'url']],
        },
      ];

      if (categoryIds?.length) {
        includeFilters[0].where = { categoryId: { [Op.in]: categoryIds } };
      }

      let resolvedCityId = cityId;

      if (resolvedCityId) {
        const outletAddresses = await this.outletAddressModel.findAll({
          where: { areaId: resolvedCityId },
          attributes: ['outletId'],
          raw: true,
        });

        const validOutletIds = outletAddresses.map(addr => addr.outletId);
        if (!validOutletIds.length) {
          return {
            data: [],
            pagination: { page: pageIndex, pageCount: 0, total: 0, count: 0 },
          };
        }

        const outletToMerchant = await this.outletProfileMetadataModel.findAll({
          where: { outletId: { [Op.in]: validOutletIds }, profileId },
          attributes: ['merchantId'],
          raw: true,
        });

        const merchantIds = [...new Set(outletToMerchant.map(o => o.merchantId))];
        if (!merchantIds.length) {
          return {
            data: [],
            pagination: { page: pageIndex, pageCount: 0, total: 0, count: 0 },
          };
        }

        baseWhereClause['merchantId'] = { [Op.in]: merchantIds };
      }

      const paginatedMerchants = await this.merchantProfileMetadataModel.findAll({
        where: baseWhereClause,
        attributes: ['id'],
        order: [
          [Sequelize.literal('"max_offer_value" IS NULL'), 'ASC'],
          ['maxOfferValue', 'DESC'],
        ],
        offset,
        limit: pageSize,
        raw: true,
      });

      const merchantIds = paginatedMerchants.map(m => m.id);
      if (!merchantIds.length) {
        return {
          data: [],
          pagination: { page: pageIndex, pageCount: 0, total: 0, count: 0 },
        };
      }

      const total = await this.merchantProfileMetadataModel.count({
        where: baseWhereClause,
      });

      const rows = await this.merchantProfileMetadataModel.findAll({
        where: { id: { [Op.in]: merchantIds } },
        include: includeFilters,
        order: [
          [Sequelize.literal('"max_offer_value" IS NULL'), 'ASC'],
          ['maxOfferValue', 'DESC'],
        ],
      });

      return {
        data: rows,
        pagination: {
          page: pageIndex,
          pageCount: Math.ceil(total / pageSize),
          total,
          count: rows.length,
        },
      };
    } catch (err) {
      this.logger.error('merchantProfileService.getMerchants failed', { err });
      throw new HttpException(
        err?.response ?? 'Failed to fetch merchant profile meta data',
        err.status ?? HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getMerchantDetails(
    merchantId: string,
    profileId: string,
    coordinate?: CoordinateDto
  ): Promise<MerchantProfileMetadata> {
    try {
      const merchantProfile = await this.fetchMerchantProfile(merchantId, profileId);
      const outlets = await this.fetchOutletsWithMetadata(merchantId, profileId);

      const outletIds = outlets.map(o => o.outletId);

      const addresses = await this.fetchOutletAddresses(outletIds, coordinate);

      const addressMap = this.mapById(addresses, 'outletId');

      let result = this.mergeOutletData(outlets, addressMap, coordinate);

      if (coordinate?.lat !== undefined && coordinate?.lng !== undefined) {
        result = await this.addDistanceToOutlets(result, coordinate);
      }

      merchantProfile.dataValues['outlets'] = result;
      return merchantProfile;
    } catch (err) {
      return this.handleGetMerchantDetailsError(err);
    }
  }

  private async fetchMerchantProfile(merchantId: string, profileId: string) {
    const profile = await this.merchantProfileMetadataModel.findOne({
      where: { merchantId, profileId, status: 'ACTIVE' },
      include: [
        {
          model: Filter,
          through: { where: { included: true }, attributes: [] },
          include: [
            { model: Category, as: 'category', attributes: ['name'] },
            { model: SubCategory, as: 'subCategory', attributes: ['name'] },
          ],
        },
        { model: MerchantProfilePhoto, attributes: [['cdn_url', 'url']] },
      ],
    });
    if (!profile) {
      throw new HttpException(ErrorMessages.merchantProfile.notFound, HttpStatus.NOT_FOUND);
    }
    const merchantHeroImage = await this.merchantProfilePhotoModel.findOne({
      where: {
        merchantProfileMetadataId: profile.id,
        isDefault: true,
        isActive: true,
      },
      attributes: ['cdnUrl'],
      order: [['updatedAt', 'DESC']],
    });
    profile.dataValues['merchantHeroImage'] = merchantHeroImage?.cdnUrl ?? null;
    return profile;
  }

  private async fetchOutletsWithMetadata(merchantId: string, profileId: string) {
    const outlets = await this.outletProfileMetadataModel.findAll({
      where: {
        merchantId,
        profileId,
        status: 'Active',
      },
      attributes: ['outletId', ['name', 'outletName'], 'maxOffer', 'hasCustomOffer'],
      raw: true,
    });

    if (!outlets?.length) {
      return [];
    }

    const outletIds = [...new Set(outlets.map(outlet => outlet.outletId).filter(Boolean))];
    const outletDetails = await this.fetchOutletNonMetaData(outletIds);
    const outletDetailsMap = Object.fromEntries(
      outletDetails.map(outlet => [
        outlet.outletId,
        {
          website: outlet.website ?? null,
          menu: outlet.menuUrl ?? null,
        },
      ])
    ) as Record<string, { website: string | null; menu: string | null }>;

    const outletsWithDetails = outlets.map(outlet => ({
      ...outlet,
      website: outletDetailsMap[outlet.outletId]?.website ?? null,
      menu: outletDetailsMap[outlet.outletId]?.menu ?? null,
    }));

    const activeMappings = await this.outletProfileMappingModel.findAll({
      where: {
        profileId,
        isActive: true,
        outletId: { [Op.in]: outletIds },
      },
      attributes: ['outletId'],
      raw: true,
    });

    const activeOutletIdSet = new Set(activeMappings.map(mapping => mapping.outletId));
    return outletsWithDetails.filter(outlet => activeOutletIdSet.has(outlet.outletId));
  }

  private async fetchOutletAddresses(outletIds: string[], coordinate?: CoordinateDto) {
    const order: any[] = [];
    const hasCoordinate = coordinate?.lat !== undefined && coordinate?.lng !== undefined;

    if (hasCoordinate) {
      const latNum = Number(coordinate.lat);
      const lngNum = Number(coordinate.lng);

      if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
        order.push([
          Sequelize.literal(`st_distancesphere(ST_Point(${lngNum}, ${latNum}), ST_Point(longitude, latitude))`),
          'ASC',
        ]);
      }
    }

    return this.outletAddressModel.findAll({
      where: { outletId: outletIds },
      attributes: ['outletId', 'latitude', 'longitude', 'location'],
      raw: true,
      ...(order.length ? { order } : {}),
    });
  }

  private async fetchOutletNonMetaData(outletIds: string[]) {
    return Outlet.findAll({
      where: { outletId: outletIds },
      attributes: ['outletId', 'has_custom_offer', 'website', 'menuUrl'],
      raw: true,
    });
  }

  private mapById<T extends { outletId: string }>(arr: T[], key: string) {
    return Object.fromEntries(arr.map(item => [item[key], item]));
  }

  private mergeOutletData(outlets: any, addressMap: Record<string, Record<string, unknown>>, coordinate?: CoordinateDto) {
    return outlets.map(outlet => {
      const latitude = addressMap[outlet.outletId]?.latitude;
      const longitude = addressMap[outlet.outletId]?.longitude;
      const parsedLatitude = latitude !== null && latitude !== undefined ? Number.parseFloat(String(latitude)) : null;
      const parsedLongitude = longitude !== null && longitude !== undefined ? Number.parseFloat(String(longitude)) : null;
      const data: Record<string, unknown> = {
        ...outlet,
        outletOffer: outlet?.maxOffer ?? null,
        location: addressMap[outlet.outletId]?.location ?? null,
        hasCustomOffer: outlet?.hasCustomOffer ?? false,
        coordinate:
          parsedLatitude !== null && parsedLongitude !== null ? { lat: parsedLatitude, lng: parsedLongitude } : null,
      };

      if (coordinate?.lat !== undefined && coordinate?.lng !== undefined) {
        data.latitude = parsedLatitude;
        data.longitude = parsedLongitude;
      }
      return data;
    });
  }

  private async addDistanceToOutlets(outlets: any[], coordinate: CoordinateDto) {
    const distanceReq: DistanceRequestDto = {
      source: { lat: coordinate.lat, lon: coordinate.lng },
      destinations: outlets
        .filter(o => o?.coordinate?.lat !== null && o?.coordinate?.lat !== undefined)
        .map(o => ({ lat: o.coordinate.lat, lon: o.coordinate.lng })),
    };

    const distanceResponse = this.distanceService.calculateDistances(distanceReq);

    const normalizeDistanceInKm = (value: unknown): number | null => {
      if (value === null || value === undefined) return null;
      const n = typeof value === 'number' ? value : Number.parseFloat(String(value));
      return Number.isFinite(n) ? n : null;
    };

    const result = outlets.map(outlet => {
      const { latitude, longitude, ...rest } = outlet;
      let distanceInKm: number | null = null;
      const outletCoordinate = rest.coordinate ?? null;

      if (outletCoordinate?.lat !== null && outletCoordinate?.lat !== undefined) {
        if (outletCoordinate?.lng !== null && outletCoordinate?.lng !== undefined) {
          const matched = distanceResponse.destinations.find(
            dest => dest.coordinate.lat === outletCoordinate.lat && dest.coordinate.lon === outletCoordinate.lng
          );
          if (matched) {
            const parsed = Number.parseFloat(String(matched.distanceInKm));
            distanceInKm = Number.isFinite(parsed) ? parsed : null;
          }
        }
      }

      return { ...rest, distanceInKm };
    });

    // Sort by computed distance (kilometers) ascending; unknown distances go last.
    return result.sort((a, b) => {
      const distanceA = normalizeDistanceInKm(a.distanceInKm);
      const distanceB = normalizeDistanceInKm(b.distanceInKm);

      if (distanceA === null && distanceB === null) return 0;
      if (distanceA === null) return 1;
      if (distanceB === null) return -1;

      return distanceA - distanceB;
    });
  }
  private handleGetMerchantDetailsError(err: unknown): never {
    if (err instanceof HttpException && err.getStatus() === HttpStatus.NOT_FOUND) {
      throw err;
    }
    this.logger.error('merchantProfileService.getMerchantDetails failed', { err });
    const httpErr = err as HttpException;
    throw new HttpException(
      httpErr?.getResponse?.() ?? 'Failed to fetch merchant profile meta data',
      httpErr?.getStatus?.() ?? HttpStatus.INTERNAL_SERVER_ERROR
    );
  }

  async getMerchantProfileMetaData(merchantId: string, profileId: string): Promise<Record<string, unknown> | null> {
    let merchantProfile;
    try {
      merchantProfile = await this.merchantProfileMetadataModel.findOne({
        where: {
          merchantId: merchantId,
          profileId: profileId,
        },
        include: [
          {
            model: Merchant,
            attributes: {
              exclude: [
                'name',
                'nameAr',
                'id',
                'status',
                'maxOfferValue',
                'activeOutletsNum',
                'inActiveOutletsNum',
                'imageUrl',
                'desc',
                'descAr',
                'createdAt',
                'updatedAt',
                'deletedAt',
              ],
            },
          },
          MERCHANT_DETAILS_FILTER_INCLUDE,
        ],
      });
      if (!merchantProfile) {
        return merchantProfile;
      }
      const plainProfile = merchantProfile.get({ plain: true });
      if (plainProfile?.filters?.length) {
        plainProfile.filters = plainProfile.filters.map(filter => {
          return {
            ...filter,
            MerchantFilter: filter?.MerchantProfileFilter,
          };
        });
      }
      if (plainProfile.merchant) {
        Object.assign(plainProfile, plainProfile.merchant);
        delete plainProfile.merchant;
      }
      const configuration = await this.getCoreMerchantAccountConfiguration(merchantId);
      const configurationPayload = configuration?.data as { data?: { paymentTerm?: unknown } } | undefined;
      plainProfile.paymentPlan = configurationPayload?.data?.paymentTerm;
      return plainProfile;
    } catch (error) {
      this.logger.error('merchantProfileService.getMerchantProfileMetaData failed', { error });
      throw new HttpException(
        error?.response ?? 'Failed to fetch merchant profile meta data',
        error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  async updateMerchantProfileMetaDataStatus(
    merchantId: string,
    profileId: string,
    status: MerchantProfileStatusEnum,
    updatedBy: string
  ): Promise<boolean> {
    try {
      this.logger.info(
        `MerchantProfileService.updateMerchantProfileMetaDataStatus called with merchant id ${merchantId}, profile id ${profileId}, and status ${status}`
      );
      const merchantProfile = await this.getMerchantProfileWithFilters(merchantId, profileId);
      let updated = false;
      switch (status) {
        case MerchantProfileStatusEnum.ACTIVE:
          if (this.canActivateMerchantProfile(merchantProfile, true)) {
            await merchantProfile.update({ status, updatedBy });
            updated = true;
          }
          break;
        case MerchantProfileStatusEnum.READY:
          if (this.canActivateMerchantProfile(merchantProfile, false)) {
            await merchantProfile.update({ status, updatedBy });
            updated = true;
          }
          break;
        default:
          await merchantProfile.update({ status, updatedBy });
          updated = true;
      }

      this.logger.info('MerchantProfileService.updateMerchantProfileMetaDataStatus completed', { updated });
      return updated;
    } catch (error) {
      this.logger.error('merchantProfileService.updateMerchantProfileMetaDataStatus failed', { error });
      throw new HttpException(
        error?.response ?? 'Failed to update merchant profile meta data status',
        error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async deleteMerchantProfilePhotoById(photoId) {
    let merchantProfilePhoto;
    try {
      merchantProfilePhoto = await this.merchantProfilePhotoModel.findByPk(photoId);
    } catch (error) {
      this.logger.error('merchantProfileService.deleteMerchantProfilePhotoById failed', { error });
      throw new HttpException('Failed to delete merchant profile ', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    if (!merchantProfilePhoto) throw new HttpException(ErrorMessages.merchantProfilePhoto.notFound, HttpStatus.NOT_FOUND);
    await merchantProfilePhoto.destroy();
    return { deleted: true };
  }
  async getMerchantProfilePhotos(merchantProfileId: string) {
    try {
      return await this.merchantProfilePhotoModel.findAll({
        where: {
          merchantProfileMetadataId: merchantProfileId,
          isActive: true,
        },
        attributes: ['id', 'merchantProfileMetadataId', 'cdnUrl', 'isDefault'],
      });
    } catch (error) {
      this.logger.error('MerchantProfileService.getMerchantProfilePhotos failed', { error });
      throw new HttpException('Failed to get merchant profile photos', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  async getCoreMerchantAccountConfiguration(id: string) {
    return await this.httpService.get<Record<string, unknown>>(
      `${process.env[EnvKeysEnum.CORE_MERCHANT_URL]}/account/configuration/${id}`
    );
  }
  async updateMerchantProfileOutletsNumber(
    merchantId: string,
    profileId: string,
    body: UpdateMerchantProfileOutletsNumberDto,
    transaction: Transaction
  ) {
    try {
      const merchantProfile = await this.merchantProfileMetadataModel.findOne({
        where: {
          merchantId: merchantId,
          profileId: profileId,
        },
      });
      if (!merchantProfile) throw new HttpException(ErrorMessages.common.entityNotFound('Merchant profile'), 404);
      await this.merchantProfileMetadataModel.update(
        {
          activeOutletsNum: body.activeOutletsNum,
          inActiveOutletsNum: body.inActiveOutletsNum,
        },
        {
          where: {
            merchantId: merchantId,
            profileId: profileId,
          },
          transaction: transaction,
        }
      );
    } catch (error) {
      this.logger.error('MerchantProfileService.updateMerchantProfileOutletsNumber', { error });
      throw new HttpException(
        error?.response ?? 'failed to update the outlet counts in the merchantProfile',
        error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async updateMerchantProfileCustomOffer(
    merchantId: string,
    profileId: string,
    hasCustomOffer: boolean,
    maxOfferValue: number
  ): Promise<void> {
    try {
      const merchantProfile = await this.merchantProfileMetadataModel.findOne({
        where: { merchantId, profileId },
      });

      if (!merchantProfile) {
        this.logger.warn('MerchantProfileService.updateMerchantProfileCustomOffer - merchant profile not found', {
          merchantId,
          profileId,
        });
        return;
      }

      await merchantProfile.update({ hasCustomOffer, maxOfferValue });
      this.logger.info('MerchantProfileService.updateMerchantProfileCustomOffer completed', {
        merchantId,
        profileId,
      });
    } catch (error) {
      this.logger.error('MerchantProfileService.updateMerchantProfileCustomOffer failed', { error });
      throw new HttpException(
        error?.response ?? 'failed to update merchant profile custom offer',
        error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Bulk update from either Kafka or HTTP.
   * Returns counts similar to the old Kafka consumer implementation.
   */
  async updateMerchantMopMaxOffersCustomOffer(updates: Array<any>): Promise<{
    successCount: number;
    failedCount: number;
    failedItems: Array<{ merchantId: string; profileId: string }>;
    message?: string;
  }> {
    if (!this.isRewardEngineEnabled) {
      this.logger.info('receiveMerchantMopMaxOffers - skipped because reward engine is disabled');
      return {
        successCount: 0,
        failedCount: 0,
        failedItems: [],
        message: 'Reward engine is not enabled',
      };
    }

    const safeUpdates = Array.isArray(updates) ? updates : [];
    this.logger.info('receiveMerchantMopMaxOffers - payload received', { total: safeUpdates.length });

    let successCount = 0;
    let failedCount = 0;
    const failedItems: Array<{ merchantId: string; profileId: string }> = [];

    for (const item of safeUpdates) {
      const { merchantId, profileId, hasCustomOffer, maxOfferValue } = item ?? {};

      if (!merchantId || !profileId) {
        failedCount++;
        continue;
      }

      const parsedMaxOfferValue = Number(maxOfferValue);
      if (!Number.isFinite(parsedMaxOfferValue)) {
        failedCount++;
        continue;
      }

      try {
        await this.updateMerchantProfileCustomOffer(merchantId, profileId, Boolean(hasCustomOffer), parsedMaxOfferValue);
        successCount++;
      } catch (err) {
        failedCount++;
        failedItems.push({ merchantId, profileId });
        this.logger.error('receiveMerchantMopMaxOffers - item update failed', {
          merchantId,
          profileId,
          err,
        });
      }
    }

    this.logger.info('receiveMerchantMopMaxOffers - payload processed', {
      total: safeUpdates.length,
      successCount,
      failedCount,
      failedItems,
    });

    return { successCount, failedCount, failedItems };
  }
  canActivateMerchantProfile(merchantProfile: MerchantProfileMetadata, isCloNeeded: boolean): boolean {
    if (!merchantProfile.name) {
      throw new HttpException(ErrorMessages.merchant.missingRequiredFields, 404);
    }
    if (merchantProfile?.merchant?.status !== MerchantStatusEnum.ACTIVE && isCloNeeded) {
      throw new HttpException(ErrorMessages.merchantProfile.cloStatusShouldBeActive, 400);
    }
    if (merchantProfile.filters.length <= 0) {
      throw new HttpException(ErrorMessages.merchantProfile.merchantProfileShouldBelongToAtLeastOneCategory, 422);
    }
    return true;
  }
  private async getMerchantProfileWithFilters(merchantId: string, profileId: string) {
    try {
      this.logger.info(
        `MerchantProfileService.getMerchantProfileWithFilters called with merchant id ${merchantId} and ${profileId}`
      );
      const merchantProfile = await this.merchantProfileMetadataModel.findOne({
        where: {
          merchantId: merchantId,
          profileId: profileId,
        },
        include: [
          {
            model: Filter,
          },
          {
            model: Merchant,
            attributes: ['city', 'country', 'status'],
          },
        ],
      });
      if (!merchantProfile) {
        throw new HttpException(ErrorMessages.common.entityNotFound('Merchant Profile'), 404);
      }
      return merchantProfile;
    } catch (error) {
      this.logger.error('MerchantProfileService.getMerchantProfileWithFilters failed ', { error });
      throw new HttpException(
        error?.response ?? 'Failed to fetch the merchant profile ',
        error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getMerchantStatusByProfileId(merchantId: string, profileId: string): Promise<boolean> {
    try {
      this.logger.info(
        `MerchantProfileService.getMerchantStatusByProfileId called with merchant id ${merchantId} and profile id ${profileId}`
      );
      const merchantProfile = await this.merchantProfileMetadataModel.findOne({
        where: {
          merchantId,
          profileId,
        },
      });
      if (!merchantProfile) {
        throw new HttpException(ErrorMessages.common.entityNotFound('Merchant Profile'), HttpStatus.NOT_FOUND);
      }
      const status = merchantProfile?.status === MerchantProfileStatusEnum.ACTIVE;
      this.logger.info('MerchantProfileService.getMerchantStatusByProfileId completed', { status });
      return status;
    } catch (error) {
      this.logger.error('MerchantProfileService.getMerchantStatusByProfileId - exception ', { error });
      throw new HttpException(
        error?.response?.message ?? 'Failed to fetch the merchant profile ',
        error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
