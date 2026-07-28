import { DiscoveryDetailsService } from '../discovery-details.service';
import { Outlet } from 'src/outlet/models/outlet.model';
import { GetOutletDetailsDto } from '../../dtos/get-outlet-details-dto';

describe('DiscoveryDetailsService', () => {
  const outletModel = { findOne: jest.fn() } as any;
  const outletAddressModel = { findOne: jest.fn() } as any;
  const favoriteOutletService = { findByUserIdOutletId: jest.fn() } as any;
  const outletOfferProxy = {
    getOutletAllOffers: jest.fn(),
    getOutletScheduledOffer: jest.fn(),
  } as any;
  const rewardEngineWrapperProxy = { getOutletAllRewards: jest.fn() } as any;
  const payoutConfigurationProxy = { getRewardEngineBetaMerchants: jest.fn() } as any;
  const googlePlacesService = { getGoogleReview: jest.fn() } as any;
  const configService = {
    get: jest.fn().mockReturnValue({ E_COMMERCE_CATEGORY_ID: 'ecommerce-id' }),
  } as any;

  let service: DiscoveryDetailsService;

  const makeOutletProfileFilters = (filterName = 'Cuisine', categoryId = 'other') => [
    {
      filter: {
        dataValues: { name: filterName, filterName },
        nameAr: 'ar',
        name: filterName,
        subCategory: { dataValues: { name: 'en', type: 'x' }, nameAr: 'ar', name: 'en' },
        category: { dataValues: { name: 'en', categoryId }, nameAr: 'ar', name: 'en', categoryId },
      },
      dataValues: {
        id: 'f1',
        filter: {
          dataValues: {
            name: filterName,
            category: { dataValues: { name: 'cat' } },
            subCategory: { dataValues: { name: 'sub', type: 'x' } },
          },
        },
      },
    },
  ];

  const makeOutlet = (overrides: Record<string, unknown> = {}) => {
    const outlet = {
      dataValues: {
        merchantId: 'm1',
        profileOutlets: [
          {
            merchantName: 'EN',
            merchantNameAr: 'AR',
            description: 'desc',
            maxOffer: 10,
            outletProfileFilters: makeOutletProfileFilters(),
            outletProfilePhotos: [{ dataValues: { id: 'p1' }, cdnUrl: 'url' }],
          },
        ],
        outletAddress: {
          dataValues: { distance: '5000' },
          formattedAddress: 'addr',
          formattedAddressAr: 'addrAr',
          location: 'loc',
          locationAr: 'locAr',
          neighbourhood: { neighbourhoodName: 'nb', neighbourhoodNameAr: 'nbAr' },
        },
      },
      website: 'web',
      websiteAr: 'webAr',
      menuUrl: 'menu',
      menuUrlAr: 'menuAr',
      bookingUrl: 'book',
      bookingUrlAr: 'bookAr',
      profileOutlets: [
        {
          merchantName: 'EN',
          merchantNameAr: 'AR',
          description: 'desc',
          outletProfileFilters: makeOutletProfileFilters(),
          outletProfilePhotos: [{ cdnUrl: 'url' }],
        },
      ],
      outletAddress: {
        formattedAddress: 'addr',
        formattedAddressAr: 'addrAr',
        location: 'loc',
        locationAr: 'locAr',
        neighbourhood: { neighbourhoodName: 'nb', neighbourhoodNameAr: 'nbAr' },
        dataValues: {},
      },
      outletTiming: { weekdayText: [{ day: 'Mon', time: '9-5' }], weekdayTextAr: [{ day: 'الإثنين', time: '9-5' }] },
      rating: 4,
      priceLevel: 2,
      ...overrides,
    };
    return outlet as any;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MIMOJO_PROFILE_ID = 'mimojo-profile';
    service = new DiscoveryDetailsService(
      outletModel,
      outletAddressModel,
      favoriteOutletService,
      outletOfferProxy,
      rewardEngineWrapperProxy,
      payoutConfigurationProxy,
      googlePlacesService,
      configService
    );
  });

  describe('getOutletDetailsForDiscovery', () => {
    it('returns undefined when outlet not found', async () => {
      outletModel.findOne.mockResolvedValue(null);

      const result = await service.getOutletDetailsForDiscovery('user1', { outletId: 'o1' } as GetOutletDetailsDto, {});

      expect(result).toBeUndefined();
    });

    it('returns outlet details with offer proxy when merchant not in reward engine', async () => {
      const outlet = makeOutlet();
      outletModel.findOne.mockResolvedValue(outlet);
      payoutConfigurationProxy.getRewardEngineBetaMerchants.mockResolvedValue([]);
      favoriteOutletService.findByUserIdOutletId.mockResolvedValue(null);
      outletOfferProxy.getOutletAllOffers.mockResolvedValue({ data: { data: { offer: 'x' } } });
      outletOfferProxy.getOutletScheduledOffer.mockResolvedValue({ data: { data: [] } });

      const result = await service.getOutletDetailsForDiscovery('user1', { outletId: 'o1' } as GetOutletDetailsDto, {
        language: 'en',
      });

      expect(result).toBeDefined();
      expect(result.outlet).toBeDefined();
      expect((result as any).offer).toBe('x');
      expect(result.outletScheduledOffer).toEqual([]);
      expect(result.additionalMetadata).toEqual({ distance: '5.00', isFavorite: false });
      expect(outletOfferProxy.getOutletAllOffers).toHaveBeenCalled();
    });

    it('returns outlet details with reward engine when merchant in beta list', async () => {
      const outlet = makeOutlet();
      outlet.dataValues.merchantId = 'beta-merchant';
      outletModel.findOne.mockResolvedValue(outlet);
      payoutConfigurationProxy.getRewardEngineBetaMerchants.mockResolvedValue(['beta-merchant']);
      favoriteOutletService.findByUserIdOutletId.mockResolvedValue({ id: 'fav1' });
      rewardEngineWrapperProxy.getOutletAllRewards.mockResolvedValue({ data: { data: [{ id: 'r1' }] } });
      outletOfferProxy.getOutletScheduledOffer.mockResolvedValue({ data: { data: null } });

      const result = await service.getOutletDetailsForDiscovery('user1', { outletId: 'o1' } as GetOutletDetailsDto, {});

      expect((result as any).offers).toEqual([{ id: 'r1' }]);
      expect(result.additionalMetadata.isFavorite).toBe(true);
      expect(rewardEngineWrapperProxy.getOutletAllRewards).toHaveBeenCalled();
    });

    it('handles eCommerce virtual address - nulls outletAddress', async () => {
      const outlet = makeOutlet();
      outlet.dataValues.profileOutlets[0].outletProfileFilters = makeOutletProfileFilters('Cuisine', 'ecommerce-id');
      outlet.dataValues.profileOutlets[0].outletProfileFilters[0].filter.category.categoryId = 'ecommerce-id';
      outlet.dataValues.profileOutlets[0].outletProfileFilters[0].filter.category.dataValues.categoryId = 'ecommerce-id';
      outlet.outletAddress = {
        ...outlet.outletAddress,
        neighbourhood: { ...outlet.outletAddress?.neighbourhood, area: { isVirtual: true } },
      };
      outlet.dataValues.outletAddress = outlet.outletAddress;
      outletModel.findOne.mockResolvedValue(outlet);
      payoutConfigurationProxy.getRewardEngineBetaMerchants.mockResolvedValue([]);
      favoriteOutletService.findByUserIdOutletId.mockResolvedValue(null);
      outletOfferProxy.getOutletAllOffers.mockResolvedValue({ data: { data: {} } });
      outletOfferProxy.getOutletScheduledOffer.mockResolvedValue({ data: { data: null } });

      const result = await service.getOutletDetailsForDiscovery('user1', { outletId: 'o1' } as GetOutletDetailsDto, {});

      expect(result).toBeDefined();
    });

    it('passes shariahOnly to profile where when requested', async () => {
      const outlet = makeOutlet();
      outletModel.findOne.mockResolvedValue(outlet);
      payoutConfigurationProxy.getRewardEngineBetaMerchants.mockResolvedValue([]);
      favoriteOutletService.findByUserIdOutletId.mockResolvedValue(null);
      outletOfferProxy.getOutletAllOffers.mockResolvedValue({ data: { data: {} } });
      outletOfferProxy.getOutletScheduledOffer.mockResolvedValue({ data: { data: null } });

      await service.getOutletDetailsForDiscovery('user1', { outletId: 'o1', shariahOnly: true } as GetOutletDetailsDto, {});

      expect(outletModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.arrayContaining([
            expect.objectContaining({
              where: expect.objectContaining({ isShariah: true }),
            }),
          ]),
        })
      );
    });

    it('uses Arabic weekdayText when language is ar', async () => {
      const outlet = makeOutlet();
      outletModel.findOne.mockResolvedValue(outlet);
      payoutConfigurationProxy.getRewardEngineBetaMerchants.mockResolvedValue([]);
      favoriteOutletService.findByUserIdOutletId.mockResolvedValue(null);
      outletOfferProxy.getOutletAllOffers.mockResolvedValue({ data: { data: {} } });
      outletOfferProxy.getOutletScheduledOffer.mockResolvedValue({ data: { data: null } });

      await service.getOutletDetailsForDiscovery('user1', { outletId: 'o1' } as GetOutletDetailsDto, {
        language: 'ar',
      });

      expect(outletOfferProxy.getOutletAllOffers).toHaveBeenCalled();
    });
  });

  describe('getOutletDetailsForDiscoveryRewardEngine', () => {
    it('returns undefined when outlet not found', async () => {
      outletModel.findOne.mockResolvedValue(null);

      const result = await service.getOutletDetailsForDiscoveryRewardEngine(
        'user1',
        { outletId: 'o1' } as GetOutletDetailsDto,
        {}
      );

      expect(result).toBeUndefined();
    });

    it('returns outlet details with reward engine offers', async () => {
      const outlet = makeOutlet();
      outletModel.findOne.mockResolvedValue(outlet);
      favoriteOutletService.findByUserIdOutletId.mockResolvedValue(null);
      rewardEngineWrapperProxy.getOutletAllRewards.mockResolvedValue({ data: { data: [{ id: 'r1' }] } });

      const result = await service.getOutletDetailsForDiscoveryRewardEngine(
        'user1',
        { outletId: 'o1' } as GetOutletDetailsDto,
        {}
      );

      expect(result.outlet).toBeDefined();
      expect(result.offers).toEqual([{ id: 'r1' }]);
      expect(result.additionalMetadata).toBeDefined();
    });

    it('nulls outletAddress when eCommerce virtual and area isVirtual', async () => {
      const outlet = makeOutlet();
      const ecomFilters = makeOutletProfileFilters('Cuisine', 'ecommerce-id');
      ecomFilters[0].filter.category.categoryId = 'ecommerce-id';
      outlet.profileOutlets[0].outletProfileFilters = ecomFilters;
      outlet.profileOutlets[0].outletProfilePhotos = [{ dataValues: { id: 'p1' }, cdnUrl: 'url' }];
      outlet.dataValues.profileOutlets = outlet.profileOutlets;
      outlet.outletAddress = {
        ...outlet.outletAddress,
        neighbourhood: { ...outlet.outletAddress?.neighbourhood, area: { isVirtual: true } } as any,
      };
      outlet.dataValues.outletAddress = outlet.outletAddress;
      outletModel.findOne.mockResolvedValue(outlet);
      favoriteOutletService.findByUserIdOutletId.mockResolvedValue(null);
      rewardEngineWrapperProxy.getOutletAllRewards.mockResolvedValue({ data: { data: [] } });

      const result = await service.getOutletDetailsForDiscoveryRewardEngine(
        'user1',
        { outletId: 'o1' } as GetOutletDetailsDto,
        {}
      );

      expect(result.outlet).toBeDefined();
      expect(result.outlet.dataValues?.outletAddress).toBeNull();
    });
  });

  describe('getLanguageBasedData', () => {
    const makeOutletProfileFiltersForLang = () => [
      {
        filter: {
          dataValues: { name: 'en' },
          nameAr: 'ar',
          name: 'en',
          subCategory: { dataValues: { name: 'en' }, nameAr: 'ar', name: 'en' },
          category: { dataValues: { name: 'en' }, nameAr: 'ar', name: 'en' },
        },
      },
    ];

    it('uses Arabic fields when language is ar', () => {
      const outlet = {
        dataValues: {},
        website: 'en-web',
        websiteAr: 'ar-web',
        menuUrl: 'en-menu',
        menuUrlAr: 'ar-menu',
        bookingUrl: 'en-booking',
        bookingUrlAr: 'ar-booking',
        outletAddress: {
          formattedAddress: 'en-addr',
          formattedAddressAr: 'ar-addr',
          location: 'l',
          locationAr: 'lar',
          neighbourhood: { neighbourhoodName: 'n', neighbourhoodNameAr: 'nar' },
        },
        profileOutlets: [
          {
            merchantName: 'EN',
            merchantNameAr: 'AR',
            description: 'en-desc',
            descriptionAr: 'ar-desc',
            outletProfileFilters: makeOutletProfileFiltersForLang(),
          },
        ],
      } as any;
      service.getLanguageBasedData(outlet, 'ar');
      expect(outlet.dataValues['merchant_name']).toBe('AR');
      expect(outlet.website).toBe('ar-web');
      expect(outlet.outletAddress.formattedAddress).toBe('ar-addr');
      expect(outlet.outletAddress.neighbourhood.neighbourhoodName).toBe('nar');
    });

    it('uses outletTiming weekdayTextAr when language is ar', () => {
      const outlet = {
        dataValues: {},
        website: 'en-web',
        outletAddress: null,
        outletTiming: { weekdayText: 'en', weekdayTextAr: 'ar', dataValues: {} },
        profileOutlets: [{ merchantName: 'EN', description: 'd', outletProfileFilters: makeOutletProfileFiltersForLang() }],
      } as any;
      service.getLanguageBasedData(outlet, 'ar');
      expect(outlet.outletTiming.weekdayText).toBe('ar');
    });

    it('handles outlet without outletAddress', () => {
      const outlet = {
        dataValues: {},
        website: 'en-web',
        outletAddress: null,
        profileOutlets: [{ merchantName: 'EN', description: 'd', outletProfileFilters: makeOutletProfileFiltersForLang() }],
      } as any;
      service.getLanguageBasedData(outlet, 'en');
      expect(outlet.dataValues['merchant_name']).toBe('EN');
    });

    it('handles outlet without neighbourhood', () => {
      const outlet = {
        dataValues: {},
        website: 'en-web',
        outletAddress: { formattedAddress: 'a', neighbourhood: null },
        profileOutlets: [{ merchantName: 'EN', description: 'd', outletProfileFilters: makeOutletProfileFiltersForLang() }],
      } as any;
      service.getLanguageBasedData(outlet, 'en');
      expect(outlet.dataValues['merchant_name']).toBe('EN');
    });
  });

  describe('getOutletReview', () => {
    it('returns google review when outlet has googlePlaceId', async () => {
      outletAddressModel.findOne.mockResolvedValue({ googlePlaceId: 'place-123' });
      googlePlacesService.getGoogleReview.mockResolvedValue({ reviews: [] });

      const result = await service.getOutletReview('outlet-1', 'en');

      expect(outletAddressModel.findOne).toHaveBeenCalledWith({
        attributes: ['googlePlaceId'],
        where: { outletId: 'outlet-1', isActive: true },
      });
      expect(googlePlacesService.getGoogleReview).toHaveBeenCalledWith('place-123', 'en');
      expect(result).toEqual({ reviews: [] });
    });

    it('returns undefined when outlet has no address', async () => {
      outletAddressModel.findOne.mockResolvedValue(null);

      const result = await service.getOutletReview('outlet-1', 'en');

      expect(googlePlacesService.getGoogleReview).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });
});
