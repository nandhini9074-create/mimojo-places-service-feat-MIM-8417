import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { IInternalApiConfig } from 'config/interface';
import { Sequelize } from 'sequelize';
import { Area } from 'src/area/models/area.model';
import { Category } from 'src/category/models/category.model';
import { GetOutletDetailsDto } from '../dtos/get-outlet-details-dto';
import { FavoriteOutletService } from 'src/favorite-outlet/services/favorite-outlet.service';
import { GooglePlacesService } from 'src/google-places/services/google-places.service';
import { Filter } from 'src/filters/models/filter.model';
import { Neighbourhood } from 'src/neighbourhood/models/neighbourhood.model';
import { OutletAddress } from 'src/outlet/models/outlet-address.model';
import { OutletTiming } from 'src/outlet/models/outlet-timing.model';
import { Outlet } from 'src/outlet/models/outlet.model';
import { OutletOfferProxy } from 'src/outlet/proxies/outlet-offer.proxy';
import { OpeningHours } from 'src/outlet/interfaces/opening-hours';
import { SubCategory } from 'src/sub-category/models/sub-category.model';
import {
  EnvKeysEnum,
  OutletProfileFilters,
  OutletProfileMetadata,
  OutletProfilePhotos,
  OutletProfileStatusEnum,
} from '../constants/outlet-profile-imports';
import { PayoutConfigurationProxy } from 'src/outlet/proxies/payout-configuration.proxy';
import { RewardEngineWrapperProxy } from 'src/outlet/proxies/reward-engine-wrapper.proxy';
import { WhereClause } from './discovery.types';

@Injectable()
export class DiscoveryDetailsService {
  private readonly eCommerceCategoryId: string;

  constructor(
    @InjectModel(Outlet)
    private readonly outletModel: typeof Outlet,
    @InjectModel(OutletAddress)
    private readonly outletAddressModel: typeof OutletAddress,
    private readonly favoriteOutletService: FavoriteOutletService,
    private readonly outletOfferProxy: OutletOfferProxy,
    private readonly rewardEngineWrapperProxy: RewardEngineWrapperProxy,
    private readonly payoutConfigurationProxy: PayoutConfigurationProxy,
    private readonly googlePlacesService: GooglePlacesService,
    private readonly configService: ConfigService
  ) {
    const { E_COMMERCE_CATEGORY_ID } = this.configService.get<IInternalApiConfig>('internal-apis');
    this.eCommerceCategoryId = E_COMMERCE_CATEGORY_ID;
  }

  private async getOutletDiscoveryContext(
    userId: string,
    request: GetOutletDetailsDto,
    token: Record<string, string>
  ): Promise<null | {
    profileId: string;
    processedOutlet: Outlet;
    openingHours: OpeningHours[];
    distance: string | null;
    favourite: unknown;
  }> {
    const profileId = request.profileId ?? process.env[EnvKeysEnum.MIMOJO_PROFILE_ID];
    const outlet = await this.findOutletForDetails(request, profileId);

    if (!outlet) return null;

    const { processedOutlet, openingHours, distance, favourite } = await this.getOutletDiscoveryBaseData(
      outlet,
      userId,
      request,
      token
    );

    return { profileId, processedOutlet, openingHours, distance, favourite };
  }

  async getOutletDetailsForDiscovery(userId: string, request: GetOutletDetailsDto, token: Record<string, string>) {
    const context = await this.getOutletDiscoveryContext(userId, request, token);
    if (!context) return;
    const { profileId, processedOutlet, openingHours, distance, favourite } = context;

    const rewardEngineBetaMerchants = await this.payoutConfigurationProxy.getRewardEngineBetaMerchants();
    let offers = {};
    if (
      Array.isArray(rewardEngineBetaMerchants) &&
      rewardEngineBetaMerchants.includes(processedOutlet?.dataValues?.merchantId)
    ) {
      const rewardData = await this.rewardEngineWrapperProxy.getOutletAllRewards(request.outletId, token, profileId);
      offers = rewardData?.data?.data ? { offers: rewardData?.data?.data } : {};
    } else {
      const offerData = await this.outletOfferProxy.getOutletAllOffers(request.outletId, token, profileId);
      offers = offerData?.data?.data ? { ...offerData?.data?.data } : {};
    }

    const outletScheduledOffer = await this.outletOfferProxy.getOutletScheduledOffer(request.outletId);

    return {
      outlet: this.sortOutletDetails(processedOutlet),
      ...offers,
      outletScheduledOffer: outletScheduledOffer?.data?.data,
      outletOpeningHours: openingHours,
      additionalMetadata: {
        distance,
        isFavorite: favourite != null,
      },
    };
  }

  async getOutletDetailsForDiscoveryRewardEngine(
    userId: string,
    request: GetOutletDetailsDto,
    token: Record<string, string>
  ) {
    const context = await this.getOutletDiscoveryContext(userId, request, token);
    if (!context) return;
    const { profileId, processedOutlet, openingHours, distance, favourite } = context;

    const offers = await this.rewardEngineWrapperProxy.getOutletAllRewards(request.outletId, token, profileId);

    return {
      outlet: this.sortOutletDetails(processedOutlet),
      offers: offers?.data?.data,
      outletOpeningHours: openingHours,
      additionalMetadata: {
        distance,
        isFavorite: favourite != null,
      },
    };
  }

  private buildProfileWhereForDetails(request: GetOutletDetailsDto, profileId: string): WhereClause {
    const profileWhere: WhereClause = { profileId, status: OutletProfileStatusEnum.Active, outletId: request?.outletId };
    if (request.shariahOnly) {
      profileWhere.isShariah = request.shariahOnly;
    }
    return profileWhere;
  }

  private async findOutletForDetails(request: GetOutletDetailsDto, profileId: string) {
    const profileWhere = this.buildProfileWhereForDetails(request, profileId);

    const outlet = await this.outletModel.findOne({
      attributes: [
        ['outlet_id', 'id'],
        'merchantName',
        'merchantId',
        'merchantNameAr',
        'merchantLogoUrl',
        [Sequelize.literal('CAST(rating AS FLOAT)'), 'rating'],
        'userRatingsTotal',
        'priceLevel',
        'website',
        'websiteAr',
        'formattedPhoneNumber',
        'description',
        'descriptionAr',
        'source',
        'menuUrl',
        'menuUrlAr',
        'bookingUrl',
        'bookingUrlAr',
        'description',
        'hasCustomOffer',
        'maxOffer',
      ],
      where: { outletId: request.outletId },
      include: [
        {
          model: OutletProfileMetadata,
          required: true,
          as: 'profileOutlets',
          where: profileWhere,
          include: [
            {
              attributes: ['cdnUrl', 'isDefault', 'id'],
              model: OutletProfilePhotos,
              as: 'outletProfilePhotos',
              required: false,
              where: { isActive: true },
            },
            {
              attributes: ['id', 'isCustomized', 'included'],
              model: OutletProfileFilters,
              as: 'outletProfileFilters',
              required: false,
              include: [
                {
                  model: Filter,
                  required: true,
                  attributes: ['name', 'nameAr'],
                  include: [
                    {
                      model: SubCategory,
                      required: true,
                      attributes: ['name', 'nameAr', 'type'],
                    },
                    {
                      model: Category,
                      required: true,
                      attributes: ['name', 'nameAr', 'imageUrl', 'categoryId'],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          model: OutletAddress,
          attributes: [
            'formattedAddress',
            'formattedAddressAr',
            'mapUrl',
            'latitude',
            'longitude',
            'location',
            'locationAr',
            [
              Sequelize.literal(
                request.lat && request.lng ? `st_distancesphere(ST_Point(?, ?), ST_Point(longitude, latitude))` : 'null'
              ),
              'distance',
            ],
          ],
          required: false,
          where: { isActive: true },
          include: [
            {
              model: Neighbourhood,
              attributes: ['neighbourhoodName', 'neighbourhoodNameAr'],
              required: false,
              include: [
                {
                  model: Area,
                  attributes: ['isVirtual'],
                  required: false,
                },
              ],
            },
          ],
        },
        {
          model: OutletTiming,
          attributes: ['weekdayText', 'weekdayTextAr'],
          required: false,
          where: { isActive: true },
        },
      ],
      order: [
        [
          { model: OutletProfileMetadata, as: 'profileOutlets' },
          { model: OutletProfilePhotos, as: 'outletProfilePhotos' },
          'sortOrder',
          'ASC',
        ],
      ],
      replacements: [request.lng, request.lat],
    });

    return outlet;
  }

  private async getOutletDiscoveryBaseData(
    outlet: Outlet,
    userId: string,
    request: GetOutletDetailsDto,
    token: Record<string, string>
  ) {
    const openingHours: OpeningHours[] = [];
    const weekdayText =
      token?.language === 'ar' && outlet?.outletTiming?.weekdayTextAr
        ? outlet?.outletTiming?.weekdayTextAr
        : outlet?.outletTiming?.weekdayText;
    if (weekdayText) {
      for (const jsonHour of weekdayText) {
        if (jsonHour) {
          openingHours.push({
            day: jsonHour['day'],
            time: jsonHour['time']?.split(',').map(t => t.trim()) || [],
          });
        }
      }
    }

    let processedOutlet = this.getLanguageBasedData(outlet, token?.language);

    if (
      processedOutlet?.profileOutlets?.[0].outletProfileFilters.some(
        p => p.filter.category.categoryId == this.eCommerceCategoryId
      ) &&
      processedOutlet?.outletAddress?.neighbourhood?.area?.isVirtual
    ) {
      processedOutlet.dataValues.outletAddress = null;
    }

    const distance =
      processedOutlet?.dataValues?.outletAddress?.dataValues['distance'] == undefined
        ? null
        : (Number.parseFloat(processedOutlet?.dataValues?.outletAddress.dataValues['distance']) / 1000).toFixed(2);

    const favourite = await this.favoriteOutletService.findByUserIdOutletId(userId, request.outletId);

    processedOutlet.rating = processedOutlet?.rating == 0 ? null : processedOutlet?.rating;
    processedOutlet.priceLevel = processedOutlet?.priceLevel == 0 ? null : processedOutlet?.priceLevel;

    processedOutlet.maxOffer = processedOutlet?.dataValues?.profileOutlets?.[0]?.maxOffer;

    this.outletDataFormatter(processedOutlet);

    return {
      processedOutlet,
      openingHours,
      distance,
      favourite,
    };
  }

  private outletDataFormatter(outlet: Outlet) {
    type CategoryDataValues = {
      name?: string;
      categoryName?: string;
    };

    type SubCategoryDataValues = {
      name?: string;
      type?: string;
      subCategoryName?: string;
      subCategoryType?: string;
    };

    type FilterInnerDataValues = {
      name?: string;
      filterName?: string;
      category: { dataValues: CategoryDataValues };
      subCategory: { dataValues: SubCategoryDataValues };
    };

    type OutletFilter = {
      dataValues: {
        id?: string;
        outletFilterId?: string;
        filter: { dataValues: FilterInnerDataValues };
      };
    };

    type OutletPhoto = {
      dataValues: {
        id?: string;
        outletPhotoId?: string;
      };
    };

    type OutletProfile = {
      outletProfileFilters?: OutletFilter[];
      outletProfilePhotos?: OutletPhoto[];
    };

    const dataValues = outlet.dataValues as {
      outletFilters?: OutletFilter[];
      outletPhotos?: OutletPhoto[];
      profileOutlets?: OutletProfile[];
    };

    const profileOutlet = dataValues.profileOutlets?.[0];

    dataValues.outletFilters = profileOutlet?.outletProfileFilters;

    dataValues.outletFilters?.forEach(filter => {
      filter.dataValues.outletFilterId = filter.dataValues.id;
      const f = filter.dataValues.filter;
      f.dataValues.filterName = f.dataValues.name;
      f.dataValues.category.dataValues.categoryName = f.dataValues.category.dataValues.name;
      f.dataValues.subCategory.dataValues.subCategoryName = f.dataValues.subCategory.dataValues.name;
      f.dataValues.subCategory.dataValues.subCategoryType = f.dataValues.subCategory.dataValues.type;

      delete f.dataValues.name;
      delete f.dataValues.category.dataValues.name;
      delete f.dataValues.subCategory.dataValues.name;
      delete f.dataValues.subCategory.dataValues.type;
      delete filter.dataValues.id;
    });

    dataValues.outletPhotos = profileOutlet?.outletProfilePhotos;

    dataValues.outletPhotos?.forEach(photo => {
      photo.dataValues.outletPhotoId = photo.dataValues.id;
      delete photo.dataValues.id;
    });

    delete dataValues.profileOutlets;
  }

  getLanguageBasedData(outlet: Outlet, language: string) {
    const outletProfile = outlet.profileOutlets?.[0];
    outlet.dataValues['merchant_name'] =
      language === 'ar' && outletProfile?.merchantNameAr ? outletProfile?.merchantNameAr : outletProfile?.merchantName;
    outlet.website = language === 'ar' && outlet?.websiteAr ? outlet?.websiteAr : outlet?.website;
    outlet.menuUrl = language === 'ar' && outlet?.menuUrlAr ? outlet?.menuUrlAr : outlet?.menuUrl;
    outlet.bookingUrl = language === 'ar' && outlet?.bookingUrlAr ? outlet?.bookingUrlAr : outlet?.bookingUrl;
    outlet.description =
      language === 'ar' && outletProfile?.descriptionAr
        ? outletProfile?.descriptionAr
        : (outletProfile?.description ?? null);
    if (outlet.outletAddress) {
      outlet.outletAddress.formattedAddress =
        language === 'ar' && outlet?.outletAddress?.formattedAddressAr
          ? outlet?.outletAddress?.formattedAddressAr
          : outlet?.outletAddress?.formattedAddress;
      outlet.outletAddress.location =
        language === 'ar' && outlet?.outletAddress?.locationAr
          ? outlet?.outletAddress?.locationAr
          : outlet?.outletAddress?.location;

      // Add null check for neighbourhood
      if (outlet.outletAddress.neighbourhood) {
        outlet.outletAddress.neighbourhood.neighbourhoodName =
          language === 'ar' && outlet?.outletAddress?.neighbourhood?.neighbourhoodNameAr
            ? outlet?.outletAddress?.neighbourhood?.neighbourhoodNameAr
            : outlet?.outletAddress?.neighbourhood?.neighbourhoodName;
      }
    }
    // Add null check for outletTiming
    if (outlet.outletTiming) {
      outlet.outletTiming.weekdayText =
        language === 'ar' && outlet?.outletTiming?.weekdayTextAr
          ? outlet?.outletTiming?.weekdayTextAr
          : outlet?.outletTiming?.weekdayText;
    }
    outletProfile.outletProfileFilters = outletProfile.outletProfileFilters.map(filter => {
      filter.filter.dataValues['name'] =
        language === 'ar' && filter?.filter?.nameAr ? filter?.filter?.nameAr : filter?.filter?.dataValues['name'];
      filter.filter.subCategory.dataValues['name'] =
        language === 'ar' && filter?.filter?.subCategory?.nameAr
          ? filter?.filter?.subCategory?.nameAr
          : filter?.filter?.subCategory?.dataValues['name'];
      filter.filter.category.dataValues['name'] =
        language === 'ar' && filter?.filter?.category?.nameAr
          ? filter?.filter?.category?.nameAr
          : filter?.filter?.category?.dataValues['name'];

      delete filter?.filter?.dataValues?.nameAr;
      delete filter?.filter?.subCategory?.dataValues?.nameAr;
      delete filter?.filter?.category?.dataValues?.nameAr;
      return filter;
    });

    delete outlet?.dataValues?.merchantName;
    delete outlet?.dataValues?.merchantNameAr;
    delete outlet?.dataValues?.websiteAr;
    delete outlet?.dataValues?.menuUrlAr;
    delete outlet?.dataValues?.bookingUrlAr;
    delete outlet?.dataValues?.descriptionAr;
    // Add null checks for deletion operations
    if (outlet.outletAddress) {
      delete outlet?.outletAddress?.dataValues?.formattedAddressAr;
      delete outlet?.outletAddress?.dataValues?.locationAr;

      if (outlet.outletAddress.neighbourhood) {
        delete outlet?.outletAddress?.dataValues?.neighbourhood?.dataValues?.neighbourhoodNameAr;
      }
    }

    if (outlet.outletTiming) {
      delete outlet?.outletTiming?.dataValues?.weekdayTextAr;
    }
    return outlet;
  }

  async getOutletReview(outletId: string, language: string) {
    const outlet = await this.outletAddressModel.findOne({
      attributes: ['googlePlaceId'],
      where: { outletId: outletId, isActive: true },
    });
    if (outlet) {
      return await this.googlePlacesService.getGoogleReview(outlet.googlePlaceId, language);
    }
  }

  private sortOutletDetails(parsedJson) {
    const extractAndSortFilters = (data, filterName) => {
      const filters = data?.dataValues?.outletFilters
        .filter(outletFilter => filterName.includes(outletFilter.filter.dataValues.filterName))
        .map(filter => {
          //console.log(filter)
          return filter;
        });
      return filters;
    };

    parsedJson.dataValues.outletFilters = [
      ...extractAndSortFilters(parsedJson, ['Cuisine', 'مطبخ']),
      ...extractAndSortFilters(parsedJson, ['Type', 'يكتب']),
      ...extractAndSortFilters(parsedJson, ['Diet', 'نظام عذائي']),
      ...extractAndSortFilters(parsedJson, ['Preferences', 'التفضيلات']),
    ];
    return parsedJson;
  }
}
