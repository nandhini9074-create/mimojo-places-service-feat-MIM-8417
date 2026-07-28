import { Outlet } from 'src/outlet/models/outlet.model';
import { DiscoveryListingService } from '../discovery-listing.service';
import { GetOutletRequestDto } from '../../dtos/get-outlet-dto';
import { OutletSortEnum } from '../../enum/outlet-sort-enum';

jest.mock('src/outlet/models/outlet.model', () => ({
  Outlet: {
    count: jest.fn(),
  },
}));

describe('DiscoveryListingService', () => {
  const outletModel = {
    findAndCountAll: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    sequelize: { escape: jest.fn((s: string) => `'${s}'`) },
  } as any;
  const categoryService = {
    getCategoryById: jest.fn(),
  } as any;
  const filterService = {
    getFilterIdsByCategoryId: jest.fn(),
    getByFilterIds: jest.fn(),
  } as any;
  const configService = {
    get: jest.fn().mockReturnValue({
      E_COMMERCE_CATEGORY_ID: 'ecommerce-id',
      SHOW_ME_EVERYTHING_CATEGORY_ID: 'show-me-everything-id',
      MIMOJO_PROFILE_ID: 'mimojo-profile-id',
    }),
  } as any;
  const outletProfileFilterService = {
    getOutletIdsUsingAndOperation: jest.fn(),
    getOutletIdsUsingOrOperation: jest.fn(),
  } as any;
  const outletProfileMetadataService = {
    findOutletsByIdandProfile: jest.fn(),
    findOutletProfilesForFilters: jest.fn(),
  } as any;

  let service: DiscoveryListingService;

  const baseRequestDto: GetOutletRequestDto = {
    pageIndex: 1,
    pageSize: 20,
    categoryId: 'some-category',
    profileId: 'profile-1',
  } as GetOutletRequestDto;

  const makeOutletRow = (overrides: Record<string, unknown> = {}) => ({
    dataValues: {
      id: 'outlet-1',
      merchantId: 'm1',
      merchantName: 'Merchant',
      merchantNameAr: 'MerchantAr',
      name: 'Outlet',
      rating: 4,
      priceLevel: 2,
      maxOffer: 15,
      userRatingsTotal: 100,
      hasCustomOffer: false,
      distance: 5000,
      outletAddress: { location: 'loc', locationAr: 'locAr', longitude: 1, latitude: 2 },
      profileOutlets: [
        {
          merchantName: 'Merchant',
          merchantNameAr: 'MerchantAr',
          maxOffer: 15,
          hasCustomOffer: false,
          outletProfilePhotos: [{ cdnUrl: 'photo-url' }],
          outletProfileFilters: [
            {
              filter: {
                name: 'Type',
                subCategory: { name: 'Cafe', nameAr: 'مقهى' },
              },
            },
            {
              filter: {
                name: 'Cuisine',
                subCategory: { name: 'Italian', nameAr: 'إيطالي' },
              },
            },
          ],
        },
      ],
      outletFilters: [
        {
          filter: {
            category: { imageUrl: 'img', darkImageUrl: 'dark', isVirtual: false },
          },
        },
      ],
      ...overrides,
    },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MIMOJO_PROFILE_ID = 'mimojo-profile-id';
    (Outlet.count as jest.Mock).mockResolvedValue(100);
    categoryService.getCategoryById.mockResolvedValue({ id: 'cat-1', isVirtual: false });
    filterService.getFilterIdsByCategoryId.mockResolvedValue([{ dataValues: { filter_id: 'f1' } }]);
    filterService.getByFilterIds.mockResolvedValue([]);
    outletProfileFilterService.getOutletIdsUsingAndOperation.mockResolvedValue([]);
    outletProfileFilterService.getOutletIdsUsingOrOperation.mockResolvedValue([]);
    outletProfileMetadataService.findOutletsByIdandProfile.mockResolvedValue([]);
    outletProfileMetadataService.findOutletProfilesForFilters.mockResolvedValue([{ dataValues: { outletId: 'outlet-1' } }]);
    outletModel.findAndCountAll.mockResolvedValue({
      rows: [makeOutletRow()],
      count: 1,
    });
    outletModel.findAll.mockResolvedValue([makeOutletRow()]);
    outletModel.count.mockResolvedValue(1);
    service = new DiscoveryListingService(
      outletModel,
      categoryService,
      filterService,
      configService,
      outletProfileFilterService,
      outletProfileMetadataService
    );
  });

  describe('getTabCount', () => {
    it('returns totalItems and empty tabData when categoryId is not showMeEverything', async () => {
      const outlets = { rows: [{ id: '1' }], count: 5 };
      const profileWhere = { profileId: 'p1', status: 'Active' };

      const result = await service.getTabCount(outlets as any, baseRequestDto, profileWhere);

      expect(result).toEqual({ totalItems: 5, tabData: [] });
      expect(Outlet.count).not.toHaveBeenCalled();
    });

    it('calls getTotalOutletCount and returns tabCount when categoryId is showMeEverything', async () => {
      const outlets = { rows: [{ id: '1' }], count: 5 };
      const profileWhere = { profileId: 'p1', status: 'Active' };
      const dto = { ...baseRequestDto, categoryId: 'show-me-everything-id', tabNumber: 1 };

      const result = await service.getTabCount(outlets as any, dto as GetOutletRequestDto, profileWhere);

      expect(Outlet.count).toHaveBeenCalled();
      expect(result).toEqual({
        totalItems: 100,
        tabData: [
          { tabName: 'Online', tabCount: 5 },
          { tabName: 'Near me now', tabCount: 95 },
        ],
      });
    });

    it('returns correct tabCount when tabNumber is 2', async () => {
      const outlets = { rows: [{ id: '1' }], count: 10 };
      const profileWhere = { profileId: 'p1', status: 'Active' };
      const dto = { ...baseRequestDto, categoryId: 'show-me-everything-id', tabNumber: 2 };

      const result = await service.getTabCount(outlets as any, dto as GetOutletRequestDto, profileWhere);

      expect(result).toEqual({
        totalItems: 100,
        tabData: [
          { tabName: 'Online', tabCount: 90 },
          { tabName: 'Near me now', tabCount: 10 },
        ],
      });
    });
  });

  describe('getProfileTabCount', () => {
    it('returns totalItems and empty tabData when categoryId is not showMeEverything', async () => {
      const profileWhere = { profileId: 'p1', status: 'Active' };

      const result = await service.getProfileTabCount(10, baseRequestDto, profileWhere);

      expect(result).toEqual({ totalItems: 10, tabData: [] });
      expect(Outlet.count).not.toHaveBeenCalled();
    });

    it('calls getTotalOutletCount and returns tabCount when categoryId is showMeEverything', async () => {
      const profileWhere = { profileId: 'p1', status: 'Active' };
      const dto = { ...baseRequestDto, categoryId: 'show-me-everything-id', tabNumber: 2 };

      const result = await service.getProfileTabCount(15, dto as GetOutletRequestDto, profileWhere);

      expect(Outlet.count).toHaveBeenCalled();
      expect(result).toEqual({
        totalItems: 100,
        tabData: [
          { tabName: 'Online', tabCount: 85 },
          { tabName: 'Near me now', tabCount: 15 },
        ],
      });
    });
  });

  describe('getOutletV2', () => {
    it('returns paginated discovery response', async () => {
      const dto = { ...baseRequestDto, pageIndex: 0 } as GetOutletRequestDto;

      const result = await service.getOutletV2('user1', dto, 'en');

      expect(outletModel.findAndCountAll).toHaveBeenCalled();
      expect(result).toMatchObject({
        data: expect.any(Array),
        pagination: expect.objectContaining({
          page: 0,
          pageCount: expect.any(Number),
          total: 1,
          count: 1,
        }),
      });
    });

    it('applies outletIds filter when provided', async () => {
      const dto = { ...baseRequestDto, outletIds: ['o1', 'o2'] } as GetOutletRequestDto;

      await service.getOutletV2('user1', dto, 'en');

      expect(outletModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            [Symbol.for('and')]: expect.arrayContaining([expect.objectContaining({ outletId: expect.any(Object) })]),
          }),
        })
      );
    });

    it('applies virtual filter for Show Me Everything tab 1', async () => {
      categoryService.getCategoryById.mockResolvedValue(null);
      const dto = {
        ...baseRequestDto,
        categoryId: 'show-me-everything-id',
        tabNumber: 1,
      } as GetOutletRequestDto;

      await service.getOutletV2('user1', dto, 'en');

      expect(outletModel.findAndCountAll).toHaveBeenCalled();
      const include = outletModel.findAndCountAll.mock.calls[0][0].include;
      expect(include[0].include).toBeDefined();
      expect(include[0].include?.length).toBeGreaterThan(0);
    });

    it('applies city filter when cityId provided', async () => {
      const dto = { ...baseRequestDto, cityId: 'city-1' } as GetOutletRequestDto;

      await service.getOutletV2('user1', dto, 'en');

      expect(outletModel.findAndCountAll).toHaveBeenCalled();
      expect(outletModel.findAndCountAll.mock.calls[0][0].include[0].where).toMatchObject({
        areaId: 'city-1',
      });
    });

    it('applies neighbourhood filter when neighbourhoods provided', async () => {
      const dto = { ...baseRequestDto, neighbourhoods: ['n1', 'n2'] } as GetOutletRequestDto;

      await service.getOutletV2('user1', dto, 'en');

      expect(outletModel.findAndCountAll).toHaveBeenCalled();
      expect(outletModel.findAndCountAll.mock.calls[0][0].include[0].where).toMatchObject({
        neighbourhoodId: expect.any(Object),
      });
    });

    it('applies text search filter when search provided', async () => {
      const dto = { ...baseRequestDto, search: 'starbucks' } as GetOutletRequestDto;

      await service.getOutletV2('user1', dto, 'en');

      expect(outletModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            [Symbol.for('or')]: expect.any(Array),
          }),
        })
      );
    });

    it('applies onlyFavorites filter when onlyFavorites and userId provided', async () => {
      const dto = { ...baseRequestDto, onlyFavorites: true } as GetOutletRequestDto;

      await service.getOutletV2('user1', dto, 'en');

      expect(outletModel.findAndCountAll).toHaveBeenCalled();
      const include = outletModel.findAndCountAll.mock.calls[0][0].include;
      const hasFavorites = include.some((i: any) => i.as === 'favorites' || i.model?.name === 'FavoriteOutlet');
      expect(hasFavorites).toBe(true);
    });

    it('applies sorting by name', async () => {
      const dto = { ...baseRequestDto, sortBy: OutletSortEnum.name } as GetOutletRequestDto;

      await service.getOutletV2('user1', dto, 'en');

      expect(outletModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order: expect.arrayContaining([['name', 'ASC']]),
        })
      );
    });

    it('applies sorting by highlyRated', async () => {
      const dto = { ...baseRequestDto, sortBy: OutletSortEnum.highlyRated } as GetOutletRequestDto;

      await service.getOutletV2('user1', dto, 'en');

      expect(outletModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order: expect.arrayContaining([['rating', 'DESC']]),
        })
      );
    });

    it('applies sorting by popularity', async () => {
      const dto = { ...baseRequestDto, sortBy: OutletSortEnum.popularity } as GetOutletRequestDto;

      await service.getOutletV2('user1', dto, 'en');

      expect(outletModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order: expect.arrayContaining([['userRatingsTotal', 'DESC']]),
        })
      );
    });

    it('applies sorting by priceHighToLow', async () => {
      const dto = { ...baseRequestDto, sortBy: OutletSortEnum.priceHighToLow } as GetOutletRequestDto;

      await service.getOutletV2('user1', dto, 'en');

      expect(outletModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order: expect.arrayContaining([['priceLevel', 'DESC']]),
        })
      );
    });

    it('applies sorting by priceLowToHigh', async () => {
      const dto = { ...baseRequestDto, sortBy: OutletSortEnum.priceLowToHigh } as GetOutletRequestDto;

      await service.getOutletV2('user1', dto, 'en');

      expect(outletModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order: expect.arrayContaining([['priceLevel', 'ASC']]),
        })
      );
    });

    it('applies proximity sorting when sourceCoordinate provided', async () => {
      const dto = {
        ...baseRequestDto,
        sortBy: OutletSortEnum.proximity,
        sourceCoordinate: { lng: 55, lat: 25 },
      } as GetOutletRequestDto;

      await service.getOutletV2('user1', dto, 'en');

      expect(outletModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order: expect.any(Array),
          replacements: [55, 25],
        })
      );
    });
  });

  describe('getOutletV3', () => {
    it('returns paginated discovery response with tabCount', async () => {
      const result = await service.getOutletV3(baseRequestDto, 'en');

      expect(outletModel.findAndCountAll).toHaveBeenCalled();
      expect(result).toMatchObject({
        data: expect.any(Array),
        pagination: expect.any(Object),
        count: expect.any(Object),
      });
    });

    it('uses profileId from dto when provided', async () => {
      const dto = { ...baseRequestDto, profileId: 'custom-profile' } as GetOutletRequestDto;

      await service.getOutletV3(dto, 'en');

      expect(outletModel.findAndCountAll).toHaveBeenCalled();
      const include = outletModel.findAndCountAll.mock.calls[0][0].include;
      const profileInclude = include.find(
        (i: any) => i.model?.name === 'OutletProfileMetadata' || i.model?.tableName === 'outlet_profile_metadata'
      );
      expect(profileInclude?.where?.profileId).toBe('custom-profile');
    });

    it('adds isShariah to profileWhere when shariahOnly', async () => {
      const dto = { ...baseRequestDto, shariahOnly: true } as GetOutletRequestDto;

      await service.getOutletV3(dto, 'en');

      expect(outletModel.findAndCountAll).toHaveBeenCalled();
      const include = outletModel.findAndCountAll.mock.calls[0][0].include;
      const profileInclude = include.find(
        (i: any) => i.model?.name === 'OutletProfileMetadata' || i.model?.tableName === 'outlet_profile_metadata'
      );
      expect(profileInclude?.where?.isShariah).toBe(true);
    });

    it('takes maxSavings path when sortBy is maxSavings', async () => {
      const dto = { ...baseRequestDto, sortBy: OutletSortEnum.maxSavings } as GetOutletRequestDto;

      const result = await service.getOutletV3(dto, 'en');

      expect(outletModel.findAll).toHaveBeenCalled();
      expect(outletModel.findAndCountAll).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        data: expect.any(Array),
        pagination: expect.any(Object),
        count: expect.any(Object),
      });
    });

    it('takes maxSavings path when eCommerce category and proximity sort', async () => {
      const dto = {
        ...baseRequestDto,
        categoryId: 'ecommerce-id',
        sortBy: OutletSortEnum.proximity,
      } as GetOutletRequestDto;

      const result = await service.getOutletV3(dto, 'en');

      expect(outletModel.findAll).toHaveBeenCalled();
      expect(outletModel.findAndCountAll).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('ignores city when category is virtual', async () => {
      categoryService.getCategoryById.mockResolvedValue({ id: 'cat-1', isVirtual: true });
      const dto = { ...baseRequestDto, categoryId: 'virtual-cat', cityId: 'city-1' } as GetOutletRequestDto;

      await service.getOutletV3(dto, 'en');

      expect(outletModel.findAndCountAll).toHaveBeenCalled();
      const include = outletModel.findAndCountAll.mock.calls[0][0].include;
      expect(include[0].where?.areaId).toBeUndefined();
    });

    it('ignores city when Show Me Everything and tab 1', async () => {
      categoryService.getCategoryById.mockResolvedValue({
        id: 'show-me-everything-id',
        isVirtual: false,
      });
      const dto = {
        ...baseRequestDto,
        categoryId: 'show-me-everything-id',
        tabNumber: 1,
        cityId: 'city-1',
      } as GetOutletRequestDto;

      await service.getOutletV3(dto, 'en');

      expect(outletModel.findAndCountAll).toHaveBeenCalled();
      const include = outletModel.findAndCountAll.mock.calls[0][0].include;
      expect(include[0].where?.areaId).toBeUndefined();
    });

    it('applies category filter when categoryId is not showMeEverything', async () => {
      const dto = { ...baseRequestDto, categoryId: 'restaurant-cat' } as GetOutletRequestDto;

      await service.getOutletV3(dto, 'en');

      expect(filterService.getFilterIdsByCategoryId).toHaveBeenCalledWith('restaurant-cat');
      expect(outletProfileMetadataService.findOutletProfilesForFilters).toHaveBeenCalled();
    });

    it('applies required and notRequired filters', async () => {
      filterService.getByFilterIds.mockResolvedValue([
        { name: 'Type', filterId: 'f1', subCategory: { type: 'x' } },
        { name: 'Cuisine', filterId: 'f2', subCategory: { type: 'x' } },
        { name: 'Preferences', filterId: 'f3', subCategory: { type: 'TOGGLE' } },
        { name: 'Preferences', filterId: 'f4', subCategory: { type: 'RADIO' } },
        { name: 'Diet', filterId: 'f5', subCategory: { type: 'x' } },
      ]);
      outletProfileFilterService.getOutletIdsUsingOrOperation.mockResolvedValue(['meta1']);
      outletProfileFilterService.getOutletIdsUsingAndOperation.mockResolvedValue(['meta2']);
      outletProfileMetadataService.findOutletsByIdandProfile.mockResolvedValue([{ dataValues: { outletId: 'outlet-1' } }]);
      const dto = {
        ...baseRequestDto,
        requiredFilters: ['f1', 'f2'],
        nonRequiredFilters: ['f3'],
      } as GetOutletRequestDto;

      await service.getOutletV3(dto, 'en');

      expect(filterService.getByFilterIds).toHaveBeenCalledWith(['f1', 'f2']);
      expect(outletProfileFilterService.getOutletIdsUsingAndOperation).toHaveBeenCalled();
      expect(outletProfileFilterService.getOutletIdsUsingOrOperation).toHaveBeenCalled();
    });
  });

  describe('getSpecificOutlet', () => {
    it('returns paginated discovery response', async () => {
      const result = await service.getSpecificOutlet('user1', baseRequestDto);

      expect(outletModel.findAndCountAll).toHaveBeenCalled();
      expect(result).toMatchObject({
        data: expect.any(Array),
        pagination: expect.any(Object),
      });
    });

    it('takes maxSavings path when sortBy is maxSavings', async () => {
      const dto = { ...baseRequestDto, sortBy: OutletSortEnum.maxSavings } as GetOutletRequestDto;

      const result = await service.getSpecificOutlet('user1', dto);

      expect(outletModel.findAll).toHaveBeenCalled();
      expect(outletModel.findAndCountAll).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('takes maxSavings path when eCommerce and proximity', async () => {
      const dto = {
        ...baseRequestDto,
        categoryId: 'ecommerce-id',
        sortBy: OutletSortEnum.proximity,
      } as GetOutletRequestDto;

      const result = await service.getSpecificOutlet('user1', dto);

      expect(outletModel.findAll).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('applies merchantIds filter', async () => {
      const dto = { ...baseRequestDto, merchantIds: ['m1', 'm2'] } as GetOutletRequestDto;

      await service.getSpecificOutlet('user1', dto);

      expect(outletModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            [Symbol.for('and')]: expect.arrayContaining([expect.objectContaining({ merchantId: expect.any(Object) })]),
          }),
        })
      );
    });

    it('applies merchantId filter', async () => {
      const dto = { ...baseRequestDto, merchantId: 'm1' } as GetOutletRequestDto;

      await service.getSpecificOutlet('user1', dto);

      expect(outletModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            [Symbol.for('and')]: expect.any(Array),
          }),
        })
      );
    });

    it('applies outletIds filter', async () => {
      const dto = { ...baseRequestDto, outletIds: ['o1'] } as GetOutletRequestDto;

      await service.getSpecificOutlet('user1', dto);

      expect(outletModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            [Symbol.for('and')]: expect.any(Array),
          }),
        })
      );
    });

    it('applies shariahOnly to profileWhere', async () => {
      const dto = { ...baseRequestDto, shariahOnly: true } as GetOutletRequestDto;

      await service.getSpecificOutlet('user1', dto);

      expect(outletModel.findAndCountAll).toHaveBeenCalled();
      const include = outletModel.findAndCountAll.mock.calls[0][0].include;
      const profileInclude = include.find(
        (i: any) => i.model?.name === 'OutletProfileMetadata' || i.model?.tableName === 'outlet_profile_metadata'
      );
      expect(profileInclude?.where?.isShariah).toBe(true);
    });
  });

  describe('getResponseByMaxSavings', () => {
    it('returns response with useProfileMapping for specificOutlet', async () => {
      const dto = { ...baseRequestDto, sortBy: OutletSortEnum.maxSavings } as GetOutletRequestDto;

      const result = await service.getSpecificOutlet('user1', dto);

      expect(result).toMatchObject({
        data: expect.any(Array),
        pagination: expect.any(Object),
      });
      expect(outletModel.findAll).toHaveBeenCalled();
    });
  });

  describe('mapOutletToDiscoveryResponse', () => {
    it('maps outlet with Arabic language', async () => {
      const row = makeOutletRow();
      row.dataValues.profileOutlets[0].merchantNameAr = 'AR';
      row.dataValues.outletAddress.locationAr = 'locAr';
      row.dataValues.profileOutlets[0].outletProfileFilters[0].filter.subCategory.nameAr = 'مقهى';
      outletModel.findAndCountAll.mockResolvedValue({ rows: [row], count: 1 });

      const result = await service.getOutletV3(
        { ...baseRequestDto, categoryId: 'show-me-everything-id', tabNumber: 2 } as GetOutletRequestDto,
        'ar'
      );

      expect((result as any).data[0]).toMatchObject({
        merchantName: 'AR',
        location: 'locAr',
      });
    });

    it('maps outlet with tabNumber 1 (distanceInKm null)', async () => {
      outletModel.findAndCountAll.mockResolvedValue({
        rows: [makeOutletRow()],
        count: 1,
      });

      const result = await service.getOutletV3(
        { ...baseRequestDto, categoryId: 'show-me-everything-id', tabNumber: 1 } as GetOutletRequestDto,
        'en'
      );

      expect((result as any).data[0].distanceInKm).toBeNull();
    });

    it('maps outlet with priceLevel and rating 0 to null', async () => {
      const row = makeOutletRow();
      row.dataValues.priceLevel = 0;
      row.dataValues.rating = 0;
      outletModel.findAndCountAll.mockResolvedValue({ rows: [row], count: 1 });

      const result = await service.getOutletV3(baseRequestDto, 'en');

      expect((result as any).data[0].price).toBeNull();
      expect((result as any).data[0].rating).toBeNull();
    });

    it('maps outlet with categoryIcon when showMeEverything', async () => {
      const row = makeOutletRow();
      row.dataValues.outletFilters = [
        {
          filter: {
            category: {
              imageUrl: 'img.png',
              darkImageUrl: 'dark.png',
              isVirtual: false,
            },
          },
        },
      ];
      outletModel.findAndCountAll.mockResolvedValue({ rows: [row], count: 1 });

      const result = await service.getOutletV3(
        { ...baseRequestDto, categoryId: 'show-me-everything-id' } as GetOutletRequestDto,
        'en'
      );

      expect((result as any).data[0].categoryIcon).toBeDefined();
    });
  });

  describe('buildPaginatedDiscoveryResponse', () => {
    it('includes tabCount when options.tabCount provided', async () => {
      const result = await service.getOutletV3(baseRequestDto, 'en');

      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
    });

    it('excludes count when no tabCount', async () => {
      const result = await service.getSpecificOutlet('user1', baseRequestDto);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result).not.toHaveProperty('count');
    });
  });

  describe('applyRequiredFilter', () => {
    it('returns empty when getByFilterIds returns no matching filters', async () => {
      filterService.getByFilterIds.mockResolvedValue([]);
      outletProfileFilterService.getOutletIdsUsingOrOperation.mockResolvedValue([]);
      outletProfileMetadataService.findOutletsByIdandProfile.mockResolvedValue([]);
      const dto = { ...baseRequestDto, requiredFilters: ['f1'] } as GetOutletRequestDto;

      await service.getOutletV3(dto, 'en');

      expect(filterService.getByFilterIds).toHaveBeenCalledWith(['f1']);
      expect(outletModel.findAndCountAll).toHaveBeenCalled();
    });

    it('returns common outlet ids when multiple filter types', async () => {
      filterService.getByFilterIds.mockResolvedValue([
        { name: 'Type', filterId: 'f1', subCategory: { type: 'x' } },
        { name: 'Cuisine', filterId: 'f2', subCategory: { type: 'x' } },
      ]);
      outletProfileFilterService.getOutletIdsUsingOrOperation.mockResolvedValue(['meta1']);
      outletProfileMetadataService.findOutletsByIdandProfile.mockResolvedValue([{ dataValues: { outletId: 'outlet-1' } }]);
      const dto = { ...baseRequestDto, requiredFilters: ['f1', 'f2'] } as GetOutletRequestDto;

      await service.getOutletV3(dto, 'en');

      expect(outletProfileFilterService.getOutletIdsUsingOrOperation).toHaveBeenCalled();
    });
  });

  describe('applyNotRequiredFilter', () => {
    it('applies when nonRequiredFilters provided', async () => {
      outletProfileFilterService.getOutletIdsUsingAndOperation.mockResolvedValue(['meta1']);
      outletProfileMetadataService.findOutletsByIdandProfile.mockResolvedValue([{ dataValues: { outletId: 'outlet-1' } }]);
      const dto = { ...baseRequestDto, nonRequiredFilters: ['nf1'] } as GetOutletRequestDto;

      await service.getOutletV3(dto, 'en');

      expect(outletProfileFilterService.getOutletIdsUsingAndOperation).toHaveBeenCalledWith(['nf1'], false);
      expect(outletProfileMetadataService.findOutletsByIdandProfile).toHaveBeenCalled();
    });
  });

  describe('applyCategoryFilter', () => {
    it('filters by requiredOutletIds and notRequiredOutletIds intersection', async () => {
      filterService.getFilterIdsByCategoryId.mockResolvedValue([{ dataValues: { filter_id: 'f1' } }]);
      outletProfileMetadataService.findOutletProfilesForFilters.mockResolvedValue([
        { dataValues: { outletId: 'outlet-1' } },
        { dataValues: { outletId: 'outlet-2' } },
      ]);
      filterService.getByFilterIds.mockResolvedValue([{ name: 'Type', filterId: 'f1', subCategory: { type: 'x' } }]);
      outletProfileFilterService.getOutletIdsUsingOrOperation.mockResolvedValue(['meta1']);
      outletProfileFilterService.getOutletIdsUsingAndOperation.mockResolvedValue(['meta2']);
      outletProfileMetadataService.findOutletsByIdandProfile
        .mockResolvedValueOnce([{ dataValues: { outletId: 'outlet-1' } }])
        .mockResolvedValueOnce([{ dataValues: { outletId: 'outlet-1' } }]);
      const dto = {
        ...baseRequestDto,
        categoryId: 'cat-1',
        requiredFilters: ['f1'],
        nonRequiredFilters: ['nf1'],
      } as GetOutletRequestDto;

      await service.getOutletV3(dto, 'en');

      expect(outletModel.findAndCountAll).toHaveBeenCalled();
    });
  });

  describe('eCommerce category attributes', () => {
    it('uses null distance for eCommerce category in getOutletV2', async () => {
      const dto = {
        ...baseRequestDto,
        categoryId: 'ecommerce-id',
        sourceCoordinate: { lng: 55, lat: 25 },
      } as GetOutletRequestDto;

      await service.getOutletV2('user1', dto, 'en');

      expect(outletModel.findAndCountAll).toHaveBeenCalled();
      const attrs = outletModel.findAndCountAll.mock.calls[0][0].attributes;
      const distanceAttr = attrs.find((a: any) => Array.isArray(a) && a[1] === 'distance');
      expect(distanceAttr).toBeDefined();
    });
  });

  describe('branch coverage', () => {
    it('uses env MIMOJO_PROFILE_ID when profileId not in dto for getOutletV3', async () => {
      const dto = { ...baseRequestDto, profileId: undefined } as any;
      delete dto.profileId;

      await service.getOutletV3(dto, 'en');

      expect(outletModel.findAndCountAll).toHaveBeenCalled();
      const include = outletModel.findAndCountAll.mock.calls[0][0].include;
      const profileInclude = include.find(
        (i: any) => i.model?.name === 'OutletProfileMetadata' || i.model?.tableName === 'outlet_profile_metadata'
      );
      expect(profileInclude?.where?.profileId).toBe('mimojo-profile-id');
    });

    it('applies city filter when category is not virtual and not showMeEverything tab 1', async () => {
      categoryService.getCategoryById.mockResolvedValue({ id: 'restaurant', isVirtual: false });
      const dto = { ...baseRequestDto, categoryId: 'restaurant', cityId: 'city-1' } as GetOutletRequestDto;

      await service.getOutletV3(dto, 'en');

      expect(outletModel.findAndCountAll).toHaveBeenCalled();
      const include = outletModel.findAndCountAll.mock.calls[0][0].include;
      expect(include[0].where?.areaId).toBe('city-1');
    });

    it('maps outlet with no type/cuisine filters', async () => {
      const row = makeOutletRow();
      row.dataValues.profileOutlets[0].outletProfileFilters = [
        { filter: { name: 'Other', subCategory: { name: 'x', nameAr: 'y' } } },
      ];
      outletModel.findAndCountAll.mockResolvedValue({ rows: [row], count: 1 });

      const result = await service.getOutletV3(baseRequestDto, 'en');

      expect((result as any).data[0].type).toEqual([]);
      expect((result as any).data[0].cuisine).toEqual([]);
    });

    it('maps outlet with categoryIcon when isCategoryBased', async () => {
      const row = makeOutletRow();
      row.dataValues.outletFilters = [{ filter: { category: { imageUrl: 'img', darkImageUrl: 'd', isVirtual: false } } }];
      outletModel.findAndCountAll.mockResolvedValue({ rows: [row], count: 1 });

      const result = await service.getOutletV3(
        { ...baseRequestDto, categoryId: 'restaurant-cat' } as GetOutletRequestDto,
        'en'
      );

      expect((result as any).data[0].categoryIcon).toEqual([]);
    });

    it('applyRequiredFilter returns empty when no common outlets', async () => {
      filterService.getByFilterIds.mockResolvedValue([
        { name: 'Type', filterId: 'f1', subCategory: { type: 'x' } },
        { name: 'Cuisine', filterId: 'f2', subCategory: { type: 'x' } },
      ]);
      outletProfileFilterService.getOutletIdsUsingOrOperation.mockResolvedValue([]);
      outletProfileMetadataService.findOutletsByIdandProfile.mockResolvedValue([]);
      const dto = { ...baseRequestDto, requiredFilters: ['f1', 'f2'] } as GetOutletRequestDto;

      await service.getOutletV3(dto, 'en');

      expect(outletModel.findAndCountAll).toHaveBeenCalled();
    });

    it('applyCategoryFilter with requiredOutletIds only', async () => {
      filterService.getFilterIdsByCategoryId.mockResolvedValue([{ dataValues: { filter_id: 'f1' } }]);
      outletProfileMetadataService.findOutletProfilesForFilters.mockResolvedValue([
        { dataValues: { outletId: 'outlet-1' } },
      ]);
      filterService.getByFilterIds.mockResolvedValue([{ name: 'Type', filterId: 'f1', subCategory: { type: 'x' } }]);
      outletProfileFilterService.getOutletIdsUsingOrOperation.mockResolvedValue(['meta1']);
      outletProfileMetadataService.findOutletsByIdandProfile.mockResolvedValue([{ dataValues: { outletId: 'outlet-1' } }]);
      const dto = { ...baseRequestDto, categoryId: 'cat-1', requiredFilters: ['f1'] } as GetOutletRequestDto;

      await service.getOutletV3(dto, 'en');

      expect(outletModel.findAndCountAll).toHaveBeenCalled();
    });

    it('applyCategoryFilter with notRequiredOutletIds only', async () => {
      filterService.getFilterIdsByCategoryId.mockResolvedValue([{ dataValues: { filter_id: 'f1' } }]);
      outletProfileMetadataService.findOutletProfilesForFilters.mockResolvedValue([
        { dataValues: { outletId: 'outlet-1' } },
      ]);
      outletProfileFilterService.getOutletIdsUsingAndOperation.mockResolvedValue(['meta1']);
      outletProfileMetadataService.findOutletsByIdandProfile.mockResolvedValue([{ dataValues: { outletId: 'outlet-1' } }]);
      const dto = { ...baseRequestDto, categoryId: 'cat-1', nonRequiredFilters: ['nf1'] } as GetOutletRequestDto;

      await service.getOutletV3(dto, 'en');

      expect(outletModel.findAndCountAll).toHaveBeenCalled();
    });

    it('applyRequiredFilter with TOGGLE and non-TOGGLE Preferences', async () => {
      filterService.getByFilterIds.mockResolvedValue([
        { name: 'Preferences', filterId: 'f1', subCategory: { type: 'TOGGLE' } },
        { name: 'Preferences', filterId: 'f2', subCategory: { type: 'RADIO' } },
        { name: 'Diet', filterId: 'f3', subCategory: { type: 'x' } },
      ]);
      outletProfileFilterService.getOutletIdsUsingAndOperation.mockResolvedValue(['meta1']);
      outletProfileFilterService.getOutletIdsUsingOrOperation.mockResolvedValue(['meta2']);
      outletProfileMetadataService.findOutletsByIdandProfile.mockResolvedValue([{ dataValues: { outletId: 'outlet-1' } }]);
      const dto = { ...baseRequestDto, requiredFilters: ['f1', 'f2', 'f3'] } as GetOutletRequestDto;

      await service.getOutletV3(dto, 'en');

      expect(outletProfileFilterService.getOutletIdsUsingAndOperation).toHaveBeenCalled();
      expect(outletProfileFilterService.getOutletIdsUsingOrOperation).toHaveBeenCalled();
    });

    it('getSpecificOutlet uses pageIndex * pageSize for offset in maxSavings path', async () => {
      const dto = {
        ...baseRequestDto,
        sortBy: OutletSortEnum.maxSavings,
        pageIndex: 2,
        pageSize: 10,
      } as GetOutletRequestDto;

      await service.getSpecificOutlet('user1', dto);

      expect(outletModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 20,
          limit: 10,
        })
      );
    });

    it('maps outlet with distance when tabNumber 2 and distance present', async () => {
      const row = makeOutletRow();
      row.dataValues.distance = 3000;
      outletModel.findAndCountAll.mockResolvedValue({ rows: [row], count: 1 });

      const result = await service.getOutletV3(
        { ...baseRequestDto, categoryId: 'show-me-everything-id', tabNumber: 2 } as GetOutletRequestDto,
        'en'
      );

      expect((result as any).data[0].distanceInKm).toBe('3.00');
    });

    it('maps outlet with address from item when dataValues has no outletAddress', async () => {
      const row = makeOutletRow();
      delete row.dataValues.outletAddress;
      (row as any).outletAddress = { location: 'fallback-loc', locationAr: 'fallback-ar' };
      outletModel.findAndCountAll.mockResolvedValue({ rows: [row], count: 1 });

      const result = await service.getOutletV3(baseRequestDto, 'en');

      expect((result as any).data[0].location).toBe('fallback-loc');
    });

    it('buildListingPagination with multiple pages', async () => {
      outletModel.findAndCountAll.mockResolvedValue({
        rows: [makeOutletRow(), makeOutletRow()],
        count: 50,
      });

      const result = await service.getOutletV3(
        { ...baseRequestDto, pageIndex: 1, pageSize: 20 } as GetOutletRequestDto,
        'en'
      );

      expect((result as any).pagination).toMatchObject({
        page: 1,
        pageCount: 3,
        total: 50,
        count: 2,
      });
    });
  });
});
