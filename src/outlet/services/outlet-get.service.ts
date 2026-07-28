import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Sequelize, WhereOptions } from 'sequelize';
import { Area } from 'src/area/models/area.model';
import { AreaService } from 'src/area/services/area.service';
import { MerchantService } from 'src/merchant/services/merchant.service';
import { Neighbourhood } from 'src/neighbourhood/models/neighbourhood.model';
import { GetOutletDto } from '../dtos/get-outlet-dto';
import { OutletStatusEnum } from '../enums/outlet-status-enum';
import { OutletAddress } from '../models/outlet-address.model';
import { OutletFilters } from '../models/outlet-filters.model';
import { OutletPhoto } from '../models/outlet-photo.model';
import { OutletTiming } from '../models/outlet-timing.model';
import { Outlet } from '../models/outlet.model';
import { FastPaymentServiceProxy } from '../proxies/fast-payment-service.proxy';
import { OutletOfferProxy } from '../proxies/outlet-offer.proxy';
import { PosServiceProxy } from '../proxies/pos-service.proxy';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';
import { MerchantProfileMetadata } from 'src/merchant-profile/entities/merchant-profile-metadata.model';
import { RewardEngineWrapperProxy } from '../proxies/reward-engine-wrapper.proxy';
import { applyOutletFilter, applyOutletSorting } from '../shared/outlet-filter.util';
import { buildOutletFastPaymentConfig, removeCircularReferences } from '../shared/outlet-fast-payment.util';
import { FILTER_WITH_CATEGORY_SUBCATEGORY_INCLUDE } from '../shared/filter-category-subcategory-include';

/** Outlet listing and pagination by merchant */
export interface IOutletGetListingService {
  findAll(): Promise<Outlet[]>;
  getAllOutlets(merchant_id: string, token: Record<string, string>): Promise<Record<string, unknown>[]>;
  fetchOutlets(merchant_id: string, request: GetOutletDto): Promise<unknown>;
  getOutlets(merchant_id: string, request: GetOutletDto, token: Record<string, string>): Promise<unknown>;
  getMerchantOutlets(merchant_id: string): Promise<Outlet[]>;
  getOutletActiveInactiveCount(merchantId: string): Promise<{ activeOutletsNum: number; inActiveOutletNum: number }>;
}

/** Outlet retrieval by IDs and merchant */
export interface IOutletGetByIdsService {
  getAllOutletIds(merchant_id: string): Promise<string[]>;
  getAllOutletsByMerchantId(merchant_id: string): Promise<Outlet[]>;
  getOutletsByMid(mId: string): Promise<Array<{ groupId: string | null; merchantId: string; outletId: string }>>;
  getOutletsBasicDetails(outletIds: string[]): Promise<unknown>;
  getMerchantOutletDetails(outletIds: string[]): Promise<
    Array<{
      outletId: string;
      merchant: { id: string; name?: string; ar?: string; profileIds: string[] };
      outlet: { name?: string; ar?: string };
    }>
  >;
}

/** Single outlet details (full or for core) */
export interface IOutletGetDetailsService {
  getOutletDetails(outlet_id: string, token: Record<string, string>): Promise<unknown>;
  getOutletDetailsRewardEngine(outlet_id: string, token: Record<string, string>): Promise<unknown>;
  getOutletDetailForCore(outlet_id: string): Promise<Record<string, unknown> | undefined>;
  getOutlet(outletId: string): Promise<Outlet | null>;
  getOutletWithIdRaw(outletId: string): Promise<Outlet | unknown>;
  getMerchantLogo(outletId: string): Promise<Outlet | null>;
}

/** Single outlet attribute lookups */
export interface IOutletGetLookupService {
  getMidTidMapping(outlet_id: string): Promise<Outlet | null>;
  getMerchantId(outletId: string): Promise<Outlet | null>;
  getOutletNo(outletId: string): Promise<Outlet | null>;
  getOutletName(outletId: string): Promise<string | undefined>;
  getOutletStatus(outletId: string): Promise<Outlet | null>;
}

@Injectable()
export class OutletGetService
  implements IOutletGetListingService, IOutletGetByIdsService, IOutletGetDetailsService, IOutletGetLookupService
{
  constructor(
    @InjectModel(Outlet)
    private readonly outletModel: typeof Outlet,
    @InjectModel(MerchantProfileMetadata)
    private readonly merchantProfileMetadataModel: typeof MerchantProfileMetadata,
    private readonly outletOfferProxy: OutletOfferProxy,
    private readonly areaService: AreaService,
    private readonly fastPaymentServiceProxy: FastPaymentServiceProxy,
    private readonly posServiceProxy: PosServiceProxy,
    private readonly logger: CustomPinoLogger,
    @Inject(forwardRef(() => MerchantService)) private readonly merchantService: MerchantService,
    private readonly rewardEngineWrapperProxy: RewardEngineWrapperProxy
  ) {}

  findAll(): Promise<Outlet[]> {
    return this.outletModel.findAll();
  }

  async getAllOutlets(merchant_id: string, token: Record<string, string>): Promise<Record<string, unknown>[]> {
    const outlets = await this.outletModel.findAll({
      where: {
        merchantId: merchant_id,
      },
      attributes: [
        ['outlet_id', 'id'],
        'name',
        'rating',
        'userRatingsTotal',
        'status',
        'maxOffer',
        'merchantName',
        'hasCustomOffer',
        'fastPaymentStatus',
      ],
      include: [
        {
          attributes: ['location'],
          model: OutletAddress,
          required: false,
          where: { is_active: true },
        },
        {
          attributes: ['cdnUrl'],
          model: OutletPhoto,
          required: false,
          where: { is_active: true, is_default: true },
        },
      ],
      order: [['name', 'ASC']],
    });

    const offers = await this.outletOfferProxy.getAllOutletOffersByMerchantId(merchant_id, token);

    const response: Record<string, unknown>[] = [];

    for (const outlet of outlets) {
      const outletOffers = this.formatOffers(offers, outlet);

      response.push({
        id: outlet.dataValues.id,
        name: outlet.name,
        location: outlet.outletAddress?.location,
        rating: outlet.rating === 0 ? null : outlet.rating,
        userRatingsTotal: outlet.userRatingsTotal,
        status: outlet.status,
        fastPaymentStatus: outlet.fastPaymentStatus,
        maxOffer: outlet.maxOffer,
        hasCustomOffer: outlet.hasCustomOffer ?? false,
        merchantName: outlet.merchantName,
        outletPhotos: outlet.outletPhotos,
        outletAddress: outlet.outletAddress,
        offers: outletOffers,
      });
    }

    return response;
  }

  async fetchOutlets(merchant_id: string, request: GetOutletDto): Promise<unknown> {
    let where: WhereOptions = { merchantId: merchant_id };
    const order: [string, string][] = [];

    this.applyFilter(request, where);

    this.applySorting(request, order);

    const outlets = await this.outletModel.findAndCountAll({
      attributes: [['outlet_id', 'id'], 'merchantName', 'merchantLogoUrl', 'status'],
      include: [
        {
          attributes: ['location'],
          model: OutletAddress,
          required: false,
          where: { is_active: true },
        },
      ],
      where: where,
      order: order,
      offset: request.pageIndex * request.pageSize,
      limit: request.pageSize,
    });

    const data = outlets.rows.map(outlet => ({
      id: outlet.dataValues.id,
      merchantName: outlet.merchantName,
      locationName: outlet.outletAddress?.location,
      merchantLogoUrl: outlet.merchantLogoUrl,
      status: outlet.status,
    }));

    return this.buildPaginatedResponse(data, request, outlets.count);
  }

  async getOutlets(merchant_id: string, request: GetOutletDto, token: Record<string, string>): Promise<unknown> {
    let where: WhereOptions = { merchantId: merchant_id };
    const order: [string, string][] = [];

    this.applyFilter(request, where);

    // Apply sorting
    this.applySorting(request, order);

    const outlets = await this.outletModel.findAndCountAll({
      attributes: [
        ['outlet_id', 'id'],
        'name',
        'status',
        'fastPaymentStatus',
        'createdAt',
        'outletNo',
        'maxOffer',
        'hasCustomOffer',
        'hasClone',
      ],
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
      ],
      where: where,
      order: order,
      offset: request.pageIndex * request.pageSize,
      limit: request.pageSize,
    });

    const offers = await this.outletOfferProxy.getAllOutletOffersByMerchantId(merchant_id, token);

    const data: Record<string, unknown>[] = outlets.rows.map(outlet => {
      const outletOffers = this.formatOffers(offers, outlet);

      return {
        id: outlet.dataValues.id,
        name: outlet.name,
        location: outlet.outletAddress?.location,
        city: outlet?.outletAddress?.neighbourhood?.area?.areaName,
        status: outlet.status,
        fastPaymentStatus: outlet.fastPaymentStatus,
        maxOffer: outlet?.maxOffer,
        hasCustomOffer: outlet?.hasCustomOffer,
        hasClone: outlet?.hasClone,
        offers: outletOffers,
        outletNo: outlet.outletNo,
      };
    });

    return this.buildPaginatedResponse(data, request, outlets.count);
  }

  private formatOffers(offers, outlet: Outlet) {
    const blackoutDays = offers.data?.data?.outletBlackOutdays?.filter(
      item => item?.merchantOutletProfile?.outletId === outlet?.dataValues?.id
    );

    const customHours = offers.data?.data?.outletCustomHours?.filter(
      item => item?.merchantOutletProfile?.outletId === outlet?.dataValues?.id
    );

    const normalOffer = offers.data?.data?.outletNormalOffer?.filter(
      item => item?.merchantOutletProfile?.outletId === outlet?.dataValues?.id
    );

    const tieredOffer = offers.data?.data?.outletTieredOffers?.filter(
      item => item?.merchantOutletProfile?.outletId === outlet?.dataValues?.id
    );

    return {
      merchantOutletsBlackOutdays: blackoutDays,
      merchantOutletsCustomHours: customHours,
      merchantOutletsNormalOffer: normalOffer,
      merchantOutletTieredOffer: tieredOffer,
    };
  }

  private applySorting(getOutletRequestDto: GetOutletDto, order: [string, string][]) {
    applyOutletSorting(getOutletRequestDto, order);
  }

  private applyFilter(getOutletRequestDto: GetOutletDto, where: WhereOptions) {
    applyOutletFilter(getOutletRequestDto, where);
  }

  private buildListingPagination(pageIndex: number, pageSize: number, total: number, count: number) {
    return {
      page: pageIndex,
      pageCount: Math.ceil(total / pageSize),
      total,
      count,
    };
  }

  private buildPaginatedResponse<T>(data: T[], request: GetOutletDto, total: number) {
    return {
      data,
      pagination: this.buildListingPagination(request.pageIndex, request.pageSize, total, data.length),
    };
  }

  async getMerchantOutlets(merchant_id: string): Promise<Outlet[]> {
    const outlets = await this.outletModel.findAll({
      where: {
        merchantId: merchant_id,
      },
      attributes: [['outlet_id', 'id'], 'merchantName', 'rating', 'status', 'maxOffer'],
      include: [
        {
          attributes: ['location'],
          model: OutletAddress,
          required: false,
          where: { is_active: true },
        },
        {
          attributes: ['cdnUrl'],
          model: OutletPhoto,
          required: false,
          where: { is_active: true, is_default: true },
        },
      ],
    });

    return outlets;
  }

  async getMerchantLogo(outletId: string): Promise<Outlet | null> {
    const outlet = await this.outletModel.findOne({
      where: {
        outletId: outletId,
      },
      attributes: ['merchantLogoUrl'],
    });
    return outlet;
  }

  private async getOutletDetailsInternal(
    outlet_id: string,
    token: Record<string, string>,
    getOffer: (outletId: string, token: Record<string, string>) => Promise<Record<string, unknown>>
  ) {
    const outlet = await this.outletModel.findOne({
      attributes: [
        ['outlet_id', 'id'],
        'merchantId',
        'name',
        'nameAr',
        [Sequelize.literal('CAST(rating AS FLOAT)'), 'rating'],
        'priceLevel',
        'website',
        'websiteAr',
        'formattedPhoneNumber',
        'businessStatus',
        'userRatingsTotal',
        'status',
        'merchantIdsManual',
        'posIds',
        'description',
        'descriptionAr',
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
      where: { outletId: outlet_id },
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
        {
          model: OutletPhoto,
          as: 'outletPhotos',
          attributes: [['outlet_photo_id', 'id'], 'cdnUrl', 'isDefault'],
          required: false,
          where: { isActive: true },
        },
        {
          model: OutletFilters,
          attributes: [['outlet_filter_id', 'id'], 'isCustomized', 'included'],
          required: false,
          include: [FILTER_WITH_CATEGORY_SUBCATEGORY_INCLUDE],
        },
      ],
      order: [[{ model: OutletPhoto, as: 'outletPhotos' }, 'sort_order', 'ASC']],
    });

    const offerOrOffers = await getOffer(outlet_id, token);

    outlet.dataValues.rating = outlet?.dataValues.rating === 0 ? null : outlet?.dataValues.rating;
    outlet.dataValues.priceLevel = outlet?.dataValues.priceLevel === 0 ? null : outlet?.dataValues.priceLevel;

    let tabs, priceConfig, config, outletConfig;
    try {
      [tabs, priceConfig, config, outletConfig] = await Promise.all([
        this.fastPaymentServiceProxy.getOutletTabs(outlet_id, token).catch(() => null),
        this.fastPaymentServiceProxy.getOutletPriceConfig(outlet_id, token).catch(() => null),
        this.fastPaymentServiceProxy.getOutlet(outlet_id, token).catch(() => null),
        this.fastPaymentServiceProxy.getOutletConfig(outlet_id, token).catch(() => null),
      ]);
    } catch (err) {
      this.logger.error(`FastPaymentServiceProxy.getOutlet error`, { err });
    }
    const filteredOutlet = {
      ...outlet?.dataValues,
      ...offerOrOffers,
      ...buildOutletFastPaymentConfig({ tabs, priceConfig, config, outletConfig }),
    };

    return removeCircularReferences(filteredOutlet);
  }

  async getOutletDetails(outlet_id: string, token: Record<string, string>) {
    return this.getOutletDetailsInternal(outlet_id, token, async (outletId, headers) => {
      const offers = await this.outletOfferProxy.getOutletAllOffers(outletId, headers);
      return offers?.data?.data;
    });
  }

  async getOutletDetailsRewardEngine(outlet_id: string, token: Record<string, string>) {
    return this.getOutletDetailsInternal(outlet_id, token, async (outletId, headers) => {
      const offer = await this.rewardEngineWrapperProxy.getOutletAllRewards(outletId, headers);
      return { offer: offer?.data?.data };
    });
  }

  async getMidTidMapping(outlet_id: string) {
    const outlet = await this.outletModel.findOne({
      attributes: [['outlet_id', 'id'], 'name', 'midPidRelation', 'checkTerminal'],
      where: { outletId: outlet_id },
    });

    return outlet;
  }

  async getOutletDetailForCore(outlet_id: string): Promise<Record<string, unknown> | undefined> {
    const outlet = await this.outletModel.findOne({
      attributes: [
        ['outlet_id', 'outletId'],
        'merchantId',
        ['name', 'outletName'],
        'outletNo',
        'merchantName',
        [Sequelize.col('outletAddress.location'), 'location'],
      ],
      where: { outletId: outlet_id },
      include: [
        {
          attributes: ['areaId'],
          model: OutletAddress,
          required: false,
          where: { is_active: true },
        },
      ],
    });

    if (outlet) {
      const area = await this.areaService.findById(outlet?.outletAddress?.areaId);
      // const merchantMetadata =
      //   await this.merchantMetadataProxy.getMerchantMetadata(
      //     outlet.merchantId,
      //     token
      //   );
      const merchantMetadata = await this.merchantService.getMerchantById(outlet.merchantId);
      // const merchantLogo = merchantMetadata?.data?.data?.imageUrl;
      const merchantLogo = merchantMetadata.imageUrl;
      let category = null;
      if (merchantMetadata?.filters[0]?.category) category = merchantMetadata?.filters[0]?.category;

      return {
        ...outlet.dataValues,
        country: 'UAE',
        city: area?.dataValues['city'],
        merchantNo: merchantMetadata['merchantNo'],
        merchantLogo: merchantLogo,
        categoryLogo: category?.imageUrl,
        categoryId: category?.id,
        categoryName: category?.name,
      };
    }
  }

  async getMerchantId(outletId: string) {
    const outlet = await this.outletModel.findOne({
      attributes: ['merchantId', 'merchantName'],
      where: { outletId: outletId },
    });
    return outlet;
  }

  async getOutletNo(outletId: string) {
    const outlet = await this.outletModel.findOne({
      attributes: ['outletNo'],
      where: { outletId: outletId },
    });
    return outlet;
  }

  async getAllOutletIds(merchant_id: string): Promise<string[]> {
    const outlets = await this.outletModel.findAll({
      where: {
        merchantId: merchant_id,
      },
      attributes: [['outlet_id', 'id']],
    });

    return outlets.map(o => o.dataValues.id);
  }

  async getAllOutletsByMerchantId(merchant_id: string): Promise<Outlet[]> {
    const outlets = await this.outletModel.findAll({
      include: [
        {
          model: OutletAddress,
          attributes: ['location', 'areaId'],
          required: false,
          where: { is_active: true },
        },
      ],
      where: {
        merchantId: merchant_id,
      },
    });

    if (!outlets || outlets.length === 0) {
      return [];
    }
    return outlets;
  }

  async getOutletActiveInactiveCount(merchantId: string) {
    const activeCount = await this.outletModel.count({
      where: {
        merchantId: merchantId,
        status: OutletStatusEnum.Active,
      },
    });
    const inactiveCount = await this.outletModel.count({
      where: {
        merchantId: merchantId,
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

  async getOutlet(outletId: string) {
    return await this.outletModel.findOne({
      where: {
        outletId: outletId,
      },
    });
  }

  async getOutletWithIdRaw(outletId: string) {
    return await this.outletModel.findOne({
      where: {
        outletId: outletId,
      },
      raw: true,
    });
  }

  async getOutletsByMid(mId: string): Promise<Array<{ groupId: string | null; merchantId: string; outletId: string }>> {
    const outlets = await this.outletModel.findAll({
      where: {
        merchantIdsManual: {
          [Op.contains]: [mId],
        },
      },
    });

    if (outlets) {
      const merchantIds = outlets.map(o => o.merchantId);
      // const groupIds = await this.merchantGroupProxy.getMerchantGroups(
      //   merchantIds
      // );
      const groupIds = await this.merchantService.getGroupIdsByMerchantIds(merchantIds);
      // Map outlets to include groupId, merchantId, and outletId
      const outletsWithGroupInfo = outlets.map(outlet => {
        const matchingGroup = groupIds.find(
          group => (group.dataValues as Record<string, unknown>).merchantId === outlet.merchantId
        );
        return {
          groupId: matchingGroup ? matchingGroup.groupId : null,
          merchantId: outlet.merchantId,
          outletId: outlet.outletId,
        };
      });

      // Now outletsWithGroupInfo contains the desired properties
      return outletsWithGroupInfo;
    }
    return [];
  }

  async getOutletsBasicDetails(outletIds: string[]) {
    if (outletIds.length === 0) {
      return [];
    }

    const outlets = await this.outletModel.findAll({
      where: {
        outletId: {
          [Op.in]: outletIds,
        },
      },
      attributes: ['outletId', 'name', 'outletNo'],
    });

    return outlets.map(outlet => ({
      id: outlet.outletId,
      name: outlet.name,
      outletNo: outlet.outletNo,
    }));
  }

  async getMerchantOutletDetails(outletIds: string[]): Promise<
    Array<{
      outletId: string;
      merchant: { id: string; name?: string; ar?: string; profileIds: string[] };
      outlet: { name?: string; ar?: string };
    }>
  > {
    try {
      this.logger.info('OutletGetService.getMerchantOutletDetails called', { outletIds });
      if (outletIds.length === 0) {
        return [];
      }

      const outlets = await this.outletModel.findAll({
        where: {
          outletId: {
            [Op.in]: outletIds,
          },
        },
        attributes: ['outletId', 'merchantId', 'name', 'nameAr', 'merchantName', 'merchantNameAr'],
      });

      const merchantIds = [...new Set(outlets.map(o => o.merchantId).filter(Boolean))];
      const profileIdsByMerchant = await this.getProfileIdsByMerchantIds(merchantIds);

      const byId = new Map(
        outlets.map(o => [
          o.outletId,
          {
            outletId: o.outletId,
            merchant: {
              id: o.merchantId,
              ...(o.merchantName != null && { name: o.merchantName }),
              ...(o.merchantNameAr != null && o.merchantNameAr !== '' && { ar: o.merchantNameAr }),
              profileIds: profileIdsByMerchant.get(o.merchantId) ?? [],
            },
            outlet: {
              ...(o.name != null && { name: o.name }),
              ...(o.nameAr != null && o.nameAr !== '' && { ar: o.nameAr }),
            },
          },
        ])
      );

      return outletIds.map(outletId => {
        const found = byId.get(outletId);
        if (found) return found;
        return {
          outletId,
          merchant: { id: '', profileIds: [] },
          outlet: {},
        };
      });
    } catch (err) {
      this.logger.error('OutletGetService.getMerchantOutletDetails failed', { err });
      throw new HttpException('Failed to fetch getMerchantOutletDetails', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async getProfileIdsByMerchantIds(merchantIds: string[]): Promise<Map<string, string[]>> {
    if (merchantIds.length === 0) return new Map();
    const rows = await this.merchantProfileMetadataModel.findAll({
      where: { merchantId: { [Op.in]: merchantIds } },
      attributes: ['merchantId', 'profileId'],
      raw: true,
    });
    const map = new Map<string, string[]>();
    for (const row of rows) {
      const arr = map.get(row.merchantId) ?? [];
      arr.push(row.profileId);
      map.set(row.merchantId, arr);
    }
    return map;
  }

  async getOutletName(outletId: string) {
    const outlets = await this.outletModel.findOne({
      where: {
        outletId,
      },
      attributes: ['name'],
    });
    return outlets?.name;
  }

  async getOutletStatus(outletId: string) {
    const outlets = await this.outletModel.findOne({
      where: {
        outletId,
      },
      attributes: ['status'],
    });
    return outlets;
  }
}
