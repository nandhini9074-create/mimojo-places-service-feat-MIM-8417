import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { IInternalApiConfig } from 'config/interface';
import { Op, Sequelize, IncludeOptions, OrderItem } from 'sequelize';
import { Area } from 'src/area/models/area.model';
import { Category } from 'src/category/models/category.model';
import { CategoryService } from 'src/category/services/category.service';
import { OutletSortEnum } from 'src/discovery/enum/outlet-sort-enum';
import { FavoriteOutlet } from 'src/favorite-outlet/models/favorite-outlet.model';
import { Filter } from 'src/filters/models/filter.model';
import { FilterService } from 'src/filters/services/filter.service';
import { Neighbourhood } from 'src/neighbourhood/models/neighbourhood.model';
import { OutletStatusEnum } from 'src/outlet/enums/outlet-status-enum';
import { OutletAddress } from 'src/outlet/models/outlet-address.model';
import { OutletFilters } from 'src/outlet/models/outlet-filters.model';
import { OutletPhoto } from 'src/outlet/models/outlet-photo.model';
import { Outlet } from 'src/outlet/models/outlet.model';
import { SubCategory } from 'src/sub-category/models/sub-category.model';
import { GetOutletRequestDto } from '../dtos/get-outlet-dto';
import { LocationCoordinate } from '../dtos/location-coordinate-dto';
import { outletDiscoveryCategoryIconMapper } from '../mappers/discovery.mapper';
import {
  EnvKeysEnum,
  OutletProfileFilters,
  OutletProfileMetadata,
  OutletProfilePhotos,
  OutletProfileStatusEnum,
} from '../constants/outlet-profile-imports';
import { OutletProfileFilterService } from 'src/outlet-profile/services/outlet-profile-filter.service';
import { OutletProfileService } from 'src/outlet-profile/services/outlet-profile.service';
import { WhereClause } from './discovery.types';

@Injectable()
export class DiscoveryListingService {
  private readonly eCommerceCategoryId: string;
  private readonly showMeEverythingCategoryId: string;
  private readonly mimojoProfileId: string;
  constructor(
    @InjectModel(Outlet)
    private readonly outletModel: typeof Outlet,
    private readonly categoryService: CategoryService,
    private readonly filterService: FilterService,
    private readonly configService: ConfigService,
    private readonly outletProfileFilterService: OutletProfileFilterService,
    private readonly outletProfileMetadataService: OutletProfileService
  ) {
    const { E_COMMERCE_CATEGORY_ID, SHOW_ME_EVERYTHING_CATEGORY_ID, MIMOJO_PROFILE_ID } =
      this.configService.get<IInternalApiConfig>('internal-apis');
    this.eCommerceCategoryId = E_COMMERCE_CATEGORY_ID;
    this.showMeEverythingCategoryId = SHOW_ME_EVERYTHING_CATEGORY_ID;
    this.mimojoProfileId = MIMOJO_PROFILE_ID;
  }

  private getDiscoveryOutletAttributes(
    sourceCoordinate: LocationCoordinate | undefined,
    categoryId: string
  ): (string | [string, string] | [ReturnType<typeof Sequelize.literal>, string])[] {
    return [
      ['outlet_id', 'id'],
      'merchantId',
      'merchantName',
      'merchantNameAr',
      'name',
      'rating',
      'priceLevel',
      'maxOffer',
      'userRatingsTotal',
      'outletAddress.longitude',
      'outletAddress.latitude',
      'hasCustomOffer',
      [
        Sequelize.literal(
          sourceCoordinate && categoryId != this.eCommerceCategoryId
            ? `st_distancesphere(ST_Point(?, ?), ST_Point(longitude, latitude))`
            : 'null'
        ),
        'distance',
      ],
    ];
  }

  private getOutletProfileMetadataInclude(): IncludeOptions[] {
    return [
      {
        attributes: ['cdnUrl'],
        model: OutletProfilePhotos,
        required: false,
        where: { is_active: true, is_default: true },
      },
      {
        attributes: ['id', 'filter_id'],
        model: OutletProfileFilters,
        as: 'outletProfileFilters',
        required: false,
        include: [
          {
            attributes: ['name', 'category_id'],
            model: Filter,
            required: false,
            include: [
              {
                attributes: ['name', 'nameAr'],
                model: SubCategory,
              },
              {
                attributes: ['name', 'nameAr', 'imageUrl', 'darkImageUrl', 'isAnimated', 'isVirtual'],
                model: Category,
              },
            ],
          },
        ],
      },
    ];
  }

  private getOutletPhotoAndFiltersInclude(): IncludeOptions[] {
    return [
      {
        attributes: ['cdnUrl'],
        model: OutletPhoto,
        required: false,
        where: { is_active: true, is_default: true },
      },
      {
        attributes: ['outlet_filter_id', 'filter_id', 'outlet_id'],
        model: OutletFilters,
        as: 'outletFilters',
        required: false,
        include: [
          {
            attributes: ['name', 'category_id'],
            model: Filter,
            required: false,
            include: [
              {
                attributes: ['name', 'nameAr'],
                model: SubCategory,
              },
              {
                attributes: ['name', 'nameAr', 'imageUrl', 'darkImageUrl', 'isAnimated', 'isVirtual'],
                model: Category,
              },
            ],
          },
        ],
      },
    ];
  }

  /*
   * @deprecated This endpoint is deprecated and will be removed in future versions.
   */
  async getOutletV2(userId: string, getOutletRequestDto: GetOutletRequestDto, preferredLanguage: string): Promise<unknown> {
    const sourceCoordinate = getOutletRequestDto.sourceCoordinate;
    let where: WhereClause = { status: OutletStatusEnum.Active };
    let order: OrderItem[] = [];
    let include: IncludeOptions[] = [
      {
        attributes: ['longitude', 'latitude', 'location', 'locationAr'],
        model: OutletAddress,
        required: true,
        where: { is_active: true },
      },
      ...this.getOutletPhotoAndFiltersInclude(),
    ];

    const filters = await this.applyFilters(include, getOutletRequestDto, where, userId);
    include = filters.include;
    where = filters.where;

    // Apply sorting
    order = this.applySorting(getOutletRequestDto, order, sourceCoordinate);

    const outlets = await this.outletModel.findAndCountAll({
      offset: getOutletRequestDto.pageIndex * getOutletRequestDto.pageSize,
      limit: getOutletRequestDto.pageSize,
      distinct: true,
      attributes: this.getDiscoveryOutletAttributes(sourceCoordinate, getOutletRequestDto.categoryId),
      where: where,
      include: include,
      order: order,
      replacements: sourceCoordinate ? [sourceCoordinate.lng, sourceCoordinate.lat] : [],
    });

    return this.buildPaginatedDiscoveryResponse(outlets, preferredLanguage, getOutletRequestDto);
  }

  async getOutletV3(getOutletRequestDto: GetOutletRequestDto, preferredLanguage: string): Promise<unknown> {
    const sourceCoordinate = getOutletRequestDto.sourceCoordinate;
    const profileId = getOutletRequestDto.profileId ?? process.env[EnvKeysEnum.MIMOJO_PROFILE_ID];
    const profileWhere: WhereClause = { profileId, status: OutletProfileStatusEnum.Active };
    if (getOutletRequestDto.shariahOnly) profileWhere.isShariah = getOutletRequestDto.shariahOnly;
    let where: WhereClause = { status: OutletStatusEnum.Active };

    if (
      getOutletRequestDto.sortBy === OutletSortEnum.maxSavings ||
      (getOutletRequestDto.categoryId == this.eCommerceCategoryId && getOutletRequestDto.sortBy === OutletSortEnum.proximity)
    ) {
      return await this.getResponseByMaxSavings(getOutletRequestDto, preferredLanguage, where, profileWhere, profileId);
    }
    let order: OrderItem[] = [];
    let tabCount: unknown = [];
    let include: IncludeOptions[] = [
      {
        attributes: ['longitude', 'latitude', 'location', 'locationAr'],
        model: OutletAddress,
        required: true,
        where: { is_active: true },
      },
      {
        model: OutletProfileMetadata,
        required: true,
        where: profileWhere,
        include: this.getOutletProfileMetadataInclude(),
      },
      ...this.getOutletPhotoAndFiltersInclude(),
    ];

    const filters = await this.applyFiltersV3(include, getOutletRequestDto, where, profileId);
    include = filters.include;
    where = filters.where;

    // Apply sorting for non-maxSavings cases
    order = this.applySorting(getOutletRequestDto, order, sourceCoordinate);

    const outlets = await this.outletModel.findAndCountAll({
      offset: (getOutletRequestDto.pageIndex - 1) * getOutletRequestDto.pageSize,
      limit: getOutletRequestDto.pageSize,
      distinct: true,
      attributes: this.getDiscoveryOutletAttributes(sourceCoordinate, getOutletRequestDto.categoryId),
      where: where,
      include: include,
      order: order,
      replacements: sourceCoordinate ? [sourceCoordinate.lng, sourceCoordinate.lat] : [],
    });

    tabCount = await this.getTabCount(outlets, getOutletRequestDto, profileWhere);
    return this.buildPaginatedDiscoveryResponse(outlets, preferredLanguage, getOutletRequestDto, {
      tabCount,
    });
  }

  private async getResponseByMaxSavings(
    getOutletRequestDto: GetOutletRequestDto,
    preferredLanguage: string,
    where: WhereClause,
    profileWhere: WhereClause,
    profileId: string,
    specificOutlet?: boolean,
    userId?: string
  ) {
    const sourceCoordinate = getOutletRequestDto.sourceCoordinate;
    const profileInclude = this.getOutletProfileMetadataInclude();

    let include: IncludeOptions[] = [
      {
        attributes: ['longitude', 'latitude', 'location', 'locationAr'],
        model: OutletAddress,
        required: true,
        where: { is_active: true },
      },
      {
        model: OutletProfileMetadata,
        attributes: ['maxOffer', 'merchantName', 'merchantNameAr', 'hasCustomOffer', 'outletId', 'name'],
        required: true,
        where: profileWhere,
        include: profileInclude,
      },
      ...this.getOutletPhotoAndFiltersInclude(),
    ];

    let tabCount: unknown = [];
    let filters;
    let offset;

    if (specificOutlet) {
      filters = await this.applySpecificFilters(include, getOutletRequestDto, where, userId, profileId);
      profileWhere = {
        ...profileWhere,
        ...filters.where,
      };
      offset = getOutletRequestDto.pageIndex * getOutletRequestDto.pageSize;
    } else {
      filters = await this.applyFiltersV3(include, getOutletRequestDto, where, profileId, profileWhere);
      profileWhere = {
        ...filters.profileWhere,
      };
      offset = (getOutletRequestDto.pageIndex - 1) * getOutletRequestDto.pageSize;
    }
    include = filters.include;
    where = filters.where;

    const outlets = await this.outletModel.findAll({
      offset,
      limit: getOutletRequestDto.pageSize,
      where,
      attributes: [
        ['outlet_id', 'id'],
        'merchantId',
        'merchantName',
        'merchantNameAr',
        'name',
        'rating',
        'priceLevel',
        'maxOffer',
        'userRatingsTotal',
        'outletAddress.longitude',
        'outletAddress.latitude',
        'hasCustomOffer',
        [
          Sequelize.literal(
            sourceCoordinate && getOutletRequestDto.categoryId != this.eCommerceCategoryId
              ? `st_distancesphere(ST_Point(?, ?), ST_Point(longitude, latitude))`
              : 'null'
          ),
          'distance',
        ],
        [
          Sequelize.literal(`(
            SELECT CAST(max_offer AS DECIMAL)
            FROM outlet_profile_metadata
            WHERE outlet_id = "Outlet".outlet_id
              AND deleted_at IS NULL
              AND status = 'Active'
              AND profile_id = ${this.outletModel.sequelize.escape(profileId)}
          )`),
          'profileMaxOffer',
        ],
      ],
      include: include,
      replacements: sourceCoordinate ? [sourceCoordinate.lng, sourceCoordinate.lat] : [],
      order: [
        [Sequelize.col('profileMaxOffer'), 'DESC'],
        ['name', 'ASC'],
      ],
      subQuery: true,
      ...({ distinct: true } as Record<string, unknown>),
    });

    const outletCount = await this.outletModel.count({
      where,
      include,
      distinct: true,
    });

    const combinedResult = {
      rows: outlets,
      count: outletCount,
    };

    if (!specificOutlet) {
      tabCount = await this.getProfileTabCount(outletCount, getOutletRequestDto, profileWhere);
      return this.buildPaginatedDiscoveryResponse(combinedResult, preferredLanguage, getOutletRequestDto, {
        useProfileMapping: true,
        tabCount,
      });
    }
    return this.buildPaginatedDiscoveryResponse(combinedResult, preferredLanguage, getOutletRequestDto, {
      useProfileMapping: true,
    });
  }

  async getTabCount(
    outlets: { rows: Outlet[]; count: number },
    getOutletRequestDto: GetOutletRequestDto,
    profileWhere: WhereClause
  ): Promise<unknown> {
    if (getOutletRequestDto.categoryId == this.showMeEverythingCategoryId) {
      const totalCount = await this.getTotalOutletCount(profileWhere);
      return this.buildTabCountResponse(totalCount, outlets.count, getOutletRequestDto?.tabNumber);
    }
    return {
      totalItems: outlets.count,
      tabData: [],
    };
  }

  async getProfileTabCount(
    outletCount: number,
    getOutletRequestDto: GetOutletRequestDto,
    profileWhere: WhereClause
  ): Promise<unknown> {
    if (getOutletRequestDto.categoryId == this.showMeEverythingCategoryId) {
      const totalCount = await this.getTotalOutletCount(profileWhere);
      return this.buildTabCountResponse(totalCount, outletCount, getOutletRequestDto?.tabNumber);
    }
    return {
      totalItems: outletCount,
      tabData: [],
    };
  }

  private async getTotalOutletCount(profileWhere: WhereClause): Promise<number> {
    return Outlet.count({
      where: { status: OutletStatusEnum.Active },
      include: [
        {
          model: OutletProfileMetadata,
          required: true,
          where: profileWhere,
        },
      ],
    });
  }

  private buildTabCountResponse(totalItems: number, currentCount: number, tabNumber?: number | null) {
    return {
      totalItems,
      tabData: [
        {
          tabName: 'Online',
          tabCount: tabNumber === 1 ? currentCount : totalItems - currentCount,
        },
        {
          tabName: 'Near me now',
          tabCount: tabNumber === 2 ? currentCount : totalItems - currentCount,
        },
      ],
    };
  }

  async getSpecificOutlet(userId: string, getOutletRequestDto: GetOutletRequestDto): Promise<unknown> {
    const profileId = getOutletRequestDto?.profileId ?? process.env[EnvKeysEnum.MIMOJO_PROFILE_ID];
    let profileWhere: WhereClause = { profileId, status: OutletProfileStatusEnum.Active };
    profileWhere = this.applySpecificProfileFilter(getOutletRequestDto, profileWhere);
    const sourceCoordinate = getOutletRequestDto.sourceCoordinate;
    let where: WhereClause = { status: OutletStatusEnum.Active };

    if (
      getOutletRequestDto.sortBy === OutletSortEnum.maxSavings ||
      (getOutletRequestDto.categoryId == this.eCommerceCategoryId && getOutletRequestDto.sortBy === OutletSortEnum.proximity)
    ) {
      return await this.getResponseByMaxSavings(getOutletRequestDto, 'en', where, profileWhere, profileId, true, userId);
    }

    let order: OrderItem[] = [];
    let include: IncludeOptions[] = [
      {
        attributes: ['longitude', 'latitude', 'location'],
        model: OutletAddress,
        required: true,
        where: { is_active: true },
      },
      {
        model: OutletProfileMetadata,
        where: profileWhere,
        required: true,
        include: [
          {
            model: OutletProfilePhotos,
            attributes: ['cdnUrl'],
            required: false,
            where: { isActive: true, isDefault: true },
          },
          {
            attributes: ['id', 'filterId', 'outletProfileMetadataId'],
            model: OutletProfileFilters,
            as: 'outletProfileFilters',
            required: false,
            include: [
              {
                attributes: ['name', 'categoryId'],
                model: Filter,
                required: false,
                include: [
                  {
                    attributes: ['name'],
                    model: SubCategory,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        attributes: ['cdnUrl'],
        model: OutletPhoto,
        required: false,
        where: { is_active: true, is_default: true },
      },
      {
        attributes: ['outlet_filter_id', 'filter_id', 'outlet_id'],
        model: OutletFilters,
        as: 'outletFilters',
        required: false,
        include: [
          {
            attributes: ['name', 'category_id'],
            model: Filter,
            required: false,
            include: [
              {
                attributes: ['name'],
                model: SubCategory,
              },
            ],
          },
        ],
      },
    ];

    const filters = await this.applySpecificFilters(include, getOutletRequestDto, where, userId, profileId);
    include = filters.include;
    where = filters.where;

    // Apply sorting
    order = this.applySorting(getOutletRequestDto, order, sourceCoordinate);

    const outlets = await this.outletModel.findAndCountAll({
      offset: getOutletRequestDto.pageIndex * getOutletRequestDto.pageSize,
      limit: getOutletRequestDto.pageSize,
      distinct: true,
      attributes: [
        ['outlet_id', 'id'],
        'merchantId',
        'merchantName',
        'name',
        'rating',
        'priceLevel',
        'maxOffer',
        'userRatingsTotal',
        'outletAddress.longitude',
        'outletAddress.latitude',
        'hasCustomOffer',
        [
          Sequelize.literal(
            sourceCoordinate && getOutletRequestDto.categoryId != this.eCommerceCategoryId
              ? `st_distancesphere(ST_Point(?, ?), ST_Point(longitude, latitude))`
              : 'null'
          ),
          'distance',
        ],
      ],
      where: where,
      include: include,
      order: order,
      replacements: sourceCoordinate ? [sourceCoordinate.lng, sourceCoordinate.lat] : [],
    });

    return this.buildPaginatedDiscoveryResponse(outlets, 'en', getOutletRequestDto);
  }

  private async applySpecificFilters(
    include: IncludeOptions[],
    getOutletRequestDto: GetOutletRequestDto,
    where: WhereClause,
    userId: string,
    profileId: string
  ) {
    where = this.applyMerchantIdsFilter(getOutletRequestDto, where);
    where = this.applyMerchantIdFilter(getOutletRequestDto, where);
    where = this.applyOutletIdsFilter(getOutletRequestDto, where);
    include = this.applyCityFilter(getOutletRequestDto, include);
    include = this.applyNeighbourhoodFilter(getOutletRequestDto, include);
    where = this.applyTextSearchFilter(getOutletRequestDto, where);
    include = this.applyOnlyFavoriteFilter(getOutletRequestDto, include, userId);

    const requiredOutletIds = await this.applyRequiredFilter(getOutletRequestDto, profileId);
    const notRequiredOutletIds = await this.applyNotRequiredFilter(getOutletRequestDto, profileId);

    const categoryFilter = await this.applyCategoryFilter(
      getOutletRequestDto,
      include,
      requiredOutletIds,
      notRequiredOutletIds,
      profileId
    );

    return { include: categoryFilter.include, where, profileWhere: categoryFilter.profileWhere };
  }

  private applySpecificProfileFilter(getOutletRequestDto: GetOutletRequestDto, where: WhereClause) {
    if (getOutletRequestDto.shariahOnly) where.isShariah = getOutletRequestDto.shariahOnly;
    where = this.applyMerchantIdsFilter(getOutletRequestDto, where);
    where = this.applyMerchantIdFilter(getOutletRequestDto, where);
    where = this.applyOutletIdsFilter(getOutletRequestDto, where);
    where = this.applyTextSearchFilter(getOutletRequestDto, where);

    return where;
  }

  /*
   * @deprecated This endpoint is deprecated and will be removed in future versions.
   */
  private async applyFilters(
    include: IncludeOptions[],
    getOutletRequestDto: GetOutletRequestDto,
    where: WhereClause,
    userId: string
  ) {
    const category = getOutletRequestDto.categoryId
      ? await this.categoryService.getCategoryById(getOutletRequestDto.categoryId)
      : null;
    const isVirtual = category?.isVirtual || false;

    where = this.applyOutletIdsFilter(getOutletRequestDto, where);

    //Online category filter condition on virtual flag
    include = this.applyVirtualFilter(isVirtual, include, getOutletRequestDto);

    include = this.applyCityFilter(getOutletRequestDto, include);

    include = this.applyNeighbourhoodFilter(getOutletRequestDto, include);

    where = this.applyTextSearchFilter(getOutletRequestDto, where);

    include = this.applyOnlyFavoriteFilter(getOutletRequestDto, include, userId);

    // const requiredOutletIds = await this.applyRequiredFilter(getOutletRequestDto);

    // const notRequiredOutletIds = await this.applyNotRequiredFilter(getOutletRequestDto);

    // include = await this.applyCategoryFilter(
    //   getOutletRequestDto,
    //   include,
    //   requiredOutletIds,
    //   notRequiredOutletIds
    // );

    return { include, where };
  }

  private async applyFiltersV3(
    include: IncludeOptions[],
    getOutletRequestDto: GetOutletRequestDto,
    where: WhereClause,
    profileId: string,
    profileWhere?: WhereClause
  ) {
    const category = getOutletRequestDto.categoryId
      ? await this.categoryService.getCategoryById(getOutletRequestDto.categoryId)
      : null;
    const isVirtual = category?.isVirtual ?? false;

    // where = this.applyOutletIdsFilter(getOutletRequestDto, where);

    //Online category filter condition on virtual flag
    include = this.applyVirtualFilter(isVirtual, include, getOutletRequestDto);

    // virtual category outlets are often mapped with city "www";
    // so ignore cityId when category is virtual, or online tab requested from "Show Me Everything"
    const shouldIgnoreCity =
      category?.isVirtual || (category?.id === this.showMeEverythingCategoryId && getOutletRequestDto?.tabNumber == 1);
    if (!shouldIgnoreCity) {
      include = this.applyCityFilter(getOutletRequestDto, include);
    }

    const requiredOutletIds = await this.applyRequiredFilter(getOutletRequestDto, profileId);

    const notRequiredOutletIds = await this.applyNotRequiredFilter(getOutletRequestDto, profileId);

    const categoryFilter = await this.applyCategoryFilter(
      getOutletRequestDto,
      include,
      requiredOutletIds,
      notRequiredOutletIds,
      profileId,
      profileWhere
    );

    return { include: categoryFilter.include, where, profileWhere: categoryFilter.profileWhere };
  }

  private applyOutletIdsFilter(getOutletRequestDto: GetOutletRequestDto, where: WhereClause) {
    if (getOutletRequestDto.outletIds?.length > 0) {
      where[Op.and] = [
        {
          outletId: { [Op.in]: getOutletRequestDto.outletIds },
        },
      ];
    }
    return where;
  }

  private applyMerchantIdsFilter(getOutletRequestDto: GetOutletRequestDto, where: WhereClause) {
    if (getOutletRequestDto?.merchantIds?.length > 0) {
      where[Op.and] = [
        {
          merchantId: { [Op.in]: getOutletRequestDto.merchantIds },
        },
      ];
    }
    return where;
  }

  private applyMerchantIdFilter(getOutletRequestDto: GetOutletRequestDto, where: WhereClause) {
    if (getOutletRequestDto.merchantId) {
      where[Op.and] = [
        {
          merchantId: getOutletRequestDto.merchantId,
        },
      ];
    }
    return where;
  }

  private applyVirtualFilter(isVirtual: boolean, include: IncludeOptions[], getOutletRequestDto: GetOutletRequestDto) {
    // if the category is "Show Me Everything" and tabNumber is 1, its virtual/online search; otherwise it's near-me search
    if (getOutletRequestDto.categoryId == this.showMeEverythingCategoryId) {
      isVirtual = getOutletRequestDto.tabNumber == 1;
    }
    include[0].include = include[0].include || [];

    include[0].include.push({
      attributes: ['area_id'],
      model: Neighbourhood,
      required: true,
      include: [
        {
          attributes: ['isVirtual'],
          model: Area,
          required: true,
          where: { isVirtual: isVirtual },
        },
      ],
    });
    return include;
  }

  private getFormatedResponseObject(
    outlets: { rows: Outlet[]; count: number },
    preferredLanguage = 'en',
    getOutletRequestDto?: GetOutletRequestDto
  ) {
    const isCategoryBased =
      !getOutletRequestDto || getOutletRequestDto.categoryId !== this.showMeEverythingCategoryId ? true : false;

    const tabNumber =
      getOutletRequestDto?.categoryId === this.showMeEverythingCategoryId && getOutletRequestDto?.tabNumber
        ? getOutletRequestDto?.tabNumber
        : null;

    return outlets.rows.map(item => this.mapOutletToDiscoveryResponse(item, preferredLanguage, isCategoryBased, tabNumber));
  }

  private mapOutletToDiscoveryResponse(
    item: Outlet,
    preferredLanguage: string,
    isCategoryBased: boolean,
    tabNumber: number | null
  ) {
    const data: Record<string, unknown> =
      (item as Outlet & { dataValues?: Record<string, unknown> }).dataValues ?? (item as unknown as Record<string, unknown>);
    const outletProfile = data.profileOutlets?.[0] ?? item?.profileOutlets?.[0];
    const categoryIcon = outletDiscoveryCategoryIconMapper(item);

    const outletFilters = outletProfile?.outletProfileFilters ?? [];

    const outletType = outletFilters
      .filter(f => f.filter?.name.toLocaleLowerCase() === 'type')
      .map(m =>
        preferredLanguage === 'ar' && m.filter?.subCategory?.nameAr
          ? m.filter?.subCategory?.nameAr
          : m.filter?.subCategory?.name
      );

    const outletCuisine = outletFilters
      .filter(f => f.filter?.name.toLocaleLowerCase() === 'cuisine')
      .map(m =>
        preferredLanguage === 'ar' && m.filter?.subCategory?.nameAr
          ? m.filter?.subCategory?.nameAr
          : m.filter?.subCategory?.name
      );

    const distanceRaw = data['distance'];
    const distanceInKm =
      tabNumber == 1
        ? null // for near me now tab
        : distanceRaw == undefined || distanceRaw == null
          ? null
          : (Number.parseFloat(String(distanceRaw)) / 1000).toFixed(2);

    const address = (data.outletAddress ?? (item as unknown as Record<string, unknown>).outletAddress) as
      | { location?: string; locationAr?: string }
      | undefined;
    const priceLevel = data.priceLevel ?? (item as unknown as Record<string, unknown>).priceLevel;
    const rating = data.rating ?? (item as unknown as Record<string, unknown>).rating;

    return {
      outletId: data.id,
      merchantName:
        preferredLanguage === 'ar' && outletProfile?.merchantNameAr
          ? outletProfile?.merchantNameAr
          : outletProfile?.merchantName,
      location: preferredLanguage === 'ar' && address?.locationAr ? address?.locationAr : address?.location,
      price: priceLevel == 0 ? null : priceLevel,
      rating: rating == 0 ? null : rating,
      defaultPhoto: outletProfile?.outletProfilePhotos?.[0]?.cdnUrl,
      type: outletType === undefined ? null : outletType,
      cuisine: outletCuisine === undefined ? null : outletCuisine,
      distanceInKm,
      discount: outletProfile?.maxOffer,
      hasCustomOffer: outletProfile?.hasCustomOffer,
      categoryIcon: !isCategoryBased && categoryIcon?.length ? [categoryIcon[0]] : [],
    };
  }

  private async applyNotRequiredFilter(getOutletRequestDto: GetOutletRequestDto, profileId: string) {
    if (getOutletRequestDto?.nonRequiredFilters?.length > 0) {
      const notRequiredOutletProfileFilterIds = await this.outletProfileFilterService.getOutletIdsUsingAndOperation(
        getOutletRequestDto.nonRequiredFilters,
        false
      );

      const outletMetadata = await this.outletProfileMetadataService.findOutletsByIdandProfile(
        notRequiredOutletProfileFilterIds,
        profileId
      );

      const notRequiredOutletIds = outletMetadata.map(o => o.dataValues['outletId']);
      return notRequiredOutletIds;
    }
  }

  private async applyCategoryFilter(
    getOutletRequestDto: GetOutletRequestDto,
    include: IncludeOptions[],
    requiredOutletIds: string[],
    notRequiredOutletIds: string[],
    profileId: string,
    profileWhere?: WhereClause
  ) {
    if (getOutletRequestDto?.categoryId && getOutletRequestDto.categoryId != this.showMeEverythingCategoryId) {
      let filteredIncludeOutletIds = [];
      const categoryFilterIds = await this.filterService.getFilterIdsByCategoryId(getOutletRequestDto.categoryId);
      // const categoryOutletIds = await this.outletFilterService.getOutletIdsByFilterIds(
      //   categoryFilterIds.map((f) => f.dataValues['filter_id'])
      // );
      // const metadataIds = categoryOutletIdsWithProfileFilter.map(f => f.outletProfileFilters.outletProfileMetadataId);
      const categoryOutletIds = await this.outletProfileMetadataService.findOutletProfilesForFilters(
        categoryFilterIds.map(f => f.dataValues['filter_id']),
        profileId
      );
      // const categoryOutletIds = await this.outletProfileMetadataService.findOutletsByIdandProfile(metadataIds, profileId);
      if (requiredOutletIds && notRequiredOutletIds) {
        const commonOutletIds = requiredOutletIds.filter(outletId => notRequiredOutletIds.includes(outletId));
        filteredIncludeOutletIds.push(...categoryOutletIds.filter(o => commonOutletIds.includes(o.dataValues['outletId'])));
      } else if (requiredOutletIds) {
        filteredIncludeOutletIds.push(
          ...categoryOutletIds.filter(o => requiredOutletIds.includes(o.dataValues['outletId']))
        );
      } else if (notRequiredOutletIds) {
        filteredIncludeOutletIds.push(
          ...categoryOutletIds.filter(o => notRequiredOutletIds.includes(o.dataValues['outletId']))
        );
      } else {
        filteredIncludeOutletIds = categoryOutletIds;
      }

      include[0].where = {
        ...include[0].where,
        outletId: {
          [Op.in]: [...new Set(filteredIncludeOutletIds.map(o => o.dataValues['outletId']))],
        },
      };

      if (profileWhere) {
        profileWhere = {
          ...profileWhere,
          outletId: {
            [Op.in]: [...new Set(filteredIncludeOutletIds.map(o => o.dataValues['outletId']))],
          },
        };
      } else {
        include[1].where = {
          ...include[1].where,
          outletId: {
            [Op.in]: [...new Set(filteredIncludeOutletIds.map(o => o.dataValues['outletId']))],
          },
        };
      }
    }
    return { include, profileWhere };
  }

  private async applyRequiredFilter(getOutletRequestDto: GetOutletRequestDto, profileId: string) {
    if (getOutletRequestDto?.requiredFilters?.length > 0) {
      const allRequiredFilters = await this.filterService.getByFilterIds(getOutletRequestDto.requiredFilters);
      const requiredTypeFilterIds = allRequiredFilters.filter(p => p.name === 'Type')?.map(m => m.filterId);
      const requiredCuisineFilterIds = allRequiredFilters.filter(p => p.name === 'Cuisine')?.map(m => m.filterId);
      const requiredAndPreferenceFilterIds = allRequiredFilters
        .filter(p => p.name === 'Preferences')
        ?.filter(s => s.subCategory.type === 'TOGGLE')
        ?.map(m => m.filterId);
      const requiredOrPreferenceFilterIds = allRequiredFilters
        .filter(p => p.name === 'Preferences')
        ?.filter(s => s.subCategory.type != 'TOGGLE')
        ?.map(m => m.filterId);
      const requiredDietFilterIds = allRequiredFilters.filter(p => p.name === 'Diet')?.map(m => m.filterId);

      const [
        requiredTypeFilterOutletMetadata,
        requiredCuisineFilterOutletMetadata,
        requiredAndPreferenceFilterOutletMetadata,
        requiredOrPreferenceFilterOutletMetadata,
        requiredDietFilterOutletMetadata,
      ] = await Promise.all([
        this.outletProfileFilterService.getOutletIdsUsingOrOperation(requiredTypeFilterIds, true),
        this.outletProfileFilterService.getOutletIdsUsingOrOperation(requiredCuisineFilterIds, true),
        this.outletProfileFilterService.getOutletIdsUsingAndOperation(requiredAndPreferenceFilterIds, true),
        this.outletProfileFilterService.getOutletIdsUsingOrOperation(requiredOrPreferenceFilterIds, true),
        this.outletProfileFilterService.getOutletIdsUsingOrOperation(requiredDietFilterIds, true),
      ]);

      const [
        requiredTypeFilterOutlets,
        requiredCuisineFilterOutlets,
        requiredAndPreferenceFilterOutlets,
        requiredOrPreferenceFilterOutlets,
        requiredDietFilterOutlets,
      ] = await Promise.all([
        this.outletProfileMetadataService.findOutletsByIdandProfile(requiredTypeFilterOutletMetadata, profileId),
        this.outletProfileMetadataService.findOutletsByIdandProfile(requiredCuisineFilterOutletMetadata, profileId),
        this.outletProfileMetadataService.findOutletsByIdandProfile(requiredAndPreferenceFilterOutletMetadata, profileId),
        this.outletProfileMetadataService.findOutletsByIdandProfile(requiredOrPreferenceFilterOutletMetadata, profileId),
        this.outletProfileMetadataService.findOutletsByIdandProfile(requiredDietFilterOutletMetadata, profileId),
      ]);

      const allRequiredOutletIds = [
        requiredTypeFilterOutlets?.map(o => o.dataValues['outletId']),
        requiredCuisineFilterOutlets?.map(o => o.dataValues['outletId']),
        requiredAndPreferenceFilterOutlets?.map(o => o.dataValues['outletId']),
        requiredOrPreferenceFilterOutlets?.map(o => o.dataValues['outletId']),
        requiredDietFilterOutlets?.map(o => o.dataValues['outletId']),
      ].filter(arr => Array.isArray(arr) && arr.length > 0);

      if (allRequiredOutletIds.length === 0) {
        return [];
      }

      const commonOutletIds = allRequiredOutletIds.reduce((common, currentArray) => {
        return common.filter(element => currentArray.includes(element));
      }, allRequiredOutletIds[0]);

      return commonOutletIds;
    }
  }

  private applyOnlyFavoriteFilter(getOutletRequestDto: GetOutletRequestDto, include: IncludeOptions[], userId: string) {
    if (getOutletRequestDto.onlyFavorites && userId) {
      include.push({
        model: FavoriteOutlet,
        as: 'favorites',
        attributes: [],
        where: { userId: userId },
      });
    }
    return include;
  }

  private applyTextSearchFilter(getOutletRequestDto: GetOutletRequestDto, where: WhereClause) {
    if (getOutletRequestDto.search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${getOutletRequestDto.search}%` } },
        { merchantName: { [Op.iLike]: `%${getOutletRequestDto.search}%` } },
        { nameAr: { [Op.iLike]: `%${getOutletRequestDto.search}%` } },
        { merchantNameAr: { [Op.iLike]: `%${getOutletRequestDto.search}%` } },
      ];
    }
    return where;
  }

  private applyCityFilter(getOutletRequestDto: GetOutletRequestDto, include: IncludeOptions[]) {
    if (getOutletRequestDto.cityId) {
      include[0].where = {
        ...include[0].where,
        areaId: getOutletRequestDto.cityId,
      };
    }
    return include;
  }

  private applyNeighbourhoodFilter(getOutletRequestDto: GetOutletRequestDto, include: IncludeOptions[]) {
    if (getOutletRequestDto.neighbourhoods?.length > 0) {
      include[0].where = {
        ...include[0].where,
        neighbourhoodId: { [Op.in]: getOutletRequestDto.neighbourhoods },
      };
    }
    return include;
  }

  private applySorting(
    getOutletRequestDto: GetOutletRequestDto,
    order: OrderItem[],
    sourceCoordinate: LocationCoordinate
  ): OrderItem[] {
    if (getOutletRequestDto.sortBy) {
      if (getOutletRequestDto.sortBy === OutletSortEnum.name) {
        order.push(['name', 'ASC']);
      } else if (getOutletRequestDto.sortBy === OutletSortEnum.highlyRated) {
        order.push(['rating', 'DESC']);
      } else if (getOutletRequestDto.sortBy === OutletSortEnum.popularity) {
        order.push(['userRatingsTotal', 'DESC']);
      } else if (getOutletRequestDto.sortBy === OutletSortEnum.priceHighToLow) {
        order.push(['priceLevel', 'DESC']);
      } else if (getOutletRequestDto.sortBy === OutletSortEnum.priceLowToHigh) {
        order.push(['priceLevel', 'ASC']);
      } else if (sourceCoordinate && getOutletRequestDto.sortBy === OutletSortEnum.proximity) {
        order.push([
          Sequelize.literal(
            `st_distancesphere(ST_Point(${sourceCoordinate.lng}, ${sourceCoordinate.lat}), ST_Point(longitude, latitude))`
          ),
          'ASC',
        ]);
      }
    }
    return order;
  }

  private buildListingPagination(pageIndex: number, pageSize: number, total: number, count: number) {
    return {
      page: pageIndex,
      pageCount: Math.ceil(total / pageSize),
      total,
      count,
    };
  }

  private buildPaginatedDiscoveryResponse(
    outlets: { rows: Outlet[]; count: number },
    preferredLanguage: string,
    getOutletRequestDto: GetOutletRequestDto,
    options?: { useProfileMapping?: boolean; tabCount?: unknown }
  ) {
    const data = this.getFormatedResponseObject(outlets, preferredLanguage, getOutletRequestDto);

    const pagination = this.buildListingPagination(
      getOutletRequestDto.pageIndex,
      getOutletRequestDto.pageSize,
      outlets.count,
      outlets.rows.length
    );

    if (options?.tabCount !== undefined) {
      return {
        data,
        pagination,
        count: options.tabCount,
      };
    }

    return {
      data,
      pagination,
    };
  }
}
