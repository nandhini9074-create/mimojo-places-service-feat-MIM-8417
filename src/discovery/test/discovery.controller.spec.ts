import { Test, TestingModule } from '@nestjs/testing';
import { DiscoveryOutletController } from '../discovery-outlet.controller';
import { DiscoveryCityController } from '../discovery-city.controller';
import { AreaService } from 'src/area/services/area.service';
import { DiscoveryService } from '../services/discovery.service';
import { FavoriteOutletService } from 'src/favorite-outlet/services/favorite-outlet.service';
import { CategoryService } from 'src/category/services/category.service';
import { Sequelize } from 'sequelize-typescript';
import { Transaction } from 'sequelize';
import { GetCitiesDto } from '../dtos/get-cities-dto';
import { MarkFavoriteOutletDto } from '../dtos/mark-favorite-outlet-dto';
import { GetOutletDetailsDto } from '../dtos/get-outlet-details-dto';
import { GetOutletRequestDto } from '../dtos/get-outlet-dto';
import { baseResponseHelper } from 'src/helpers/base-response.helper';
import { OutletSortEnum } from '../enum/outlet-sort-enum';

describe('DiscoveryController', () => {
  let outletController: DiscoveryOutletController;
  let cityController: DiscoveryCityController;
  let areaService: AreaService;
  let discoveryService: DiscoveryService;
  let favoriteOutletService: FavoriteOutletService;
  let categoryService: CategoryService;
  let sequelize: Sequelize;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscoveryOutletController, DiscoveryCityController],
      providers: [
        {
          provide: AreaService,
          useValue: {
            findCitiesWithCoordicatesDefault: jest.fn(),
            findCitiesWithCoordicatesDefaultIncludingQatar: jest.fn(),
            findAllCities: jest.fn(),
            findAllCityNames: jest.fn(),
          },
        },
        {
          provide: DiscoveryService,
          useValue: {
            getOutletDetailsForDiscovery: jest.fn(),
            getOutletDetailsForDiscoveryRewardEngine: jest.fn(),
            getOutletV2: jest.fn(),
            getSpecificOutlet: jest.fn(),
            getOutletReview: jest.fn(),
            getOutletV3: jest.fn(),
          },
        },
        {
          provide: FavoriteOutletService,
          useValue: {
            markFavorite: jest.fn(),
          },
        },
        {
          provide: CategoryService,
          useValue: {
            getSubCategories: jest.fn(),
            getSubCategoriesHasOutlet: jest.fn(),
            getAllCategories: jest.fn(),
          },
        },
        {
          provide: Sequelize,
          useValue: {
            transaction: jest.fn().mockImplementation(callback => callback({} as Transaction)),
          },
        },
      ],
    }).compile();

    outletController = module.get<DiscoveryOutletController>(DiscoveryOutletController);
    cityController = module.get<DiscoveryCityController>(DiscoveryCityController);
    areaService = module.get<AreaService>(AreaService);
    discoveryService = module.get<DiscoveryService>(DiscoveryService);
    favoriteOutletService = module.get<FavoriteOutletService>(FavoriteOutletService);
    categoryService = module.get<CategoryService>(CategoryService);
    sequelize = module.get<Sequelize>(Sequelize);
  });

  describe('getAllCitiesV2', () => {
    it('should return cities including Qatar', async () => {
      const mockCities = [{ cityName: 'Dubai' }, { cityName: 'Qatar' }];
      (areaService.findCitiesWithCoordicatesDefaultIncludingQatar as jest.Mock).mockResolvedValue(mockCities);

      const request: GetCitiesDto = { lat: 10, lng: 20 };
      const req = { headers: { language: 'en' } };

      const result = await cityController.getAllCitiesV2(request, req as any);

      expect(result.data).toEqual(mockCities);
      expect(areaService.findCitiesWithCoordicatesDefaultIncludingQatar).toHaveBeenCalledWith(10, 20, 'en');
    });
  });

  describe('getCitiesAndCategories', () => {
    it('should return cities and categories combined', async () => {
      const mockCities = [{ id: '1', name: 'Dubai' }];
      const mockCategories = [{ id: 'c1', name: 'Food' }];
      (areaService.findAllCityNames as jest.Mock).mockResolvedValue(mockCities);
      (categoryService.getAllCategories as jest.Mock).mockResolvedValue(mockCategories);

      const result = await cityController.getCitiesAndCategories();

      expect(result.data).toEqual({ cities: mockCities, categories: mockCategories });
      expect(areaService.findAllCityNames).toHaveBeenCalled();
      expect(categoryService.getAllCategories).toHaveBeenCalled();
    });
  });

  describe('getOutletDetailsRewardEngine', () => {
    it('should return outlet details from reward engine', async () => {
      const mockDetails = { outlet: { id: 'o1' }, offers: [] };
      (discoveryService.getOutletDetailsForDiscoveryRewardEngine as jest.Mock).mockResolvedValue(mockDetails);

      const mockRequest: GetOutletDetailsDto = {
        outletId: 'o1',
        lat: 0,
        lng: 0,
        profileId: 'p1',
        shariahOnly: false,
      };
      const req = { headers: { language: 'en' } };

      const result = await outletController.getOutletDetailsRewardEngine('user1', mockRequest, req as any);

      expect(result.data).toEqual(mockDetails);
      expect(discoveryService.getOutletDetailsForDiscoveryRewardEngine).toHaveBeenCalledWith(
        'user1',
        mockRequest,
        req.headers
      );
    });
  });

  describe('getAllCities', () => {
    it('should return city data', async () => {
      const mockCities = [{ cityName: 'Test City' }];
      (areaService.findCitiesWithCoordicatesDefault as jest.Mock).mockResolvedValue(mockCities);

      const request: GetCitiesDto = { lat: 10, lng: 20 };
      const req = { headers: { language: 'en' } };

      const result = await cityController.getAllCities(request, req as any);

      expect(result.data).toEqual(mockCities);
      expect(areaService.findCitiesWithCoordicatesDefault).toHaveBeenCalledWith(10, 20, 'en');
    });
  });

  describe('getCities', () => {
    it('should return all cities', async () => {
      const mockCities = [{ cityName: 'City 1' }, { cityName: 'City 2' }];
      (areaService.findAllCities as jest.Mock).mockResolvedValue(mockCities);

      const result = await cityController.getCities();

      expect(result.data).toEqual(mockCities);
      expect(areaService.findAllCities).toHaveBeenCalled();
    });
  });

  describe('markFavoriteOutlet', () => {
    it('should mark favorite outlet', async () => {
      const mockRequest: MarkFavoriteOutletDto = { outletId: 'outlet1', isFavorite: true };
      const userId = 'user123';

      await outletController.markFavoriteOutlet(userId, mockRequest);

      expect(favoriteOutletService.markFavorite).toHaveBeenCalledWith(
        userId,
        mockRequest.outletId,
        mockRequest.isFavorite,
        expect.anything()
      );
    });
  });

  describe('getOutletDetails', () => {
    it('should return outlet details', async () => {
      const mockOutletDetails = { outlet: { id: 'outlet1', name: 'Outlet Test' } };
      (discoveryService.getOutletDetailsForDiscovery as jest.Mock).mockResolvedValue(mockOutletDetails);

      const mockRequest: GetOutletDetailsDto = {
        outletId: 'outlet1',
        lat: 0,
        lng: 0,
        profileId: 'profile',
        shariahOnly: false,
      };
      const req = { headers: { language: 'en' } };

      const result = await outletController.getOutletDetails('user123', mockRequest, req as any);

      expect(result.data).toEqual(mockOutletDetails);
      expect(discoveryService.getOutletDetailsForDiscovery).toHaveBeenCalledWith('user123', mockRequest, req.headers);
    });
  });

  describe('getOutlet', () => {
    it('should return outlet data', async () => {
      const mockOutletData = { id: 'outlet1', name: 'Outlet 1' };
      (discoveryService.getOutletV2 as jest.Mock).mockResolvedValue(mockOutletData);

      const mockRequest: GetOutletRequestDto = {
        pageIndex: 0,
        pageSize: 0,
        sourceCoordinate: { lng: 0, lat: 0 },
        search: '',
        sortBy: OutletSortEnum.proximity,
        onlyFavorites: false,
        requiredFilters: [],
        nonRequiredFilters: [],
        cityId: '',
        neighbourhoods: [],
        categoryId: '',
        outletIds: [],
        merchantId: '',
        tabNumber: 0,
        merchantIds: [],
        profileId: 'profile',
        shariahOnly: true,
      };
      const req = { headers: { language: 'en' } };

      const result = await outletController.getOutlet('user123', mockRequest, req as any);

      expect(result.data).toEqual(mockOutletData);
      expect(discoveryService.getOutletV2).toHaveBeenCalledWith('user123', mockRequest, req.headers.language);
    });
  });

  describe('getSpecificOutlet', () => {
    it('should return specific outlet data', async () => {
      const mockOutlet = { id: 'outlet1', name: 'Specific Outlet' };
      (discoveryService.getSpecificOutlet as jest.Mock).mockResolvedValue(mockOutlet);

      const mockRequest: GetOutletRequestDto = {
        pageIndex: 0,
        pageSize: 0,
        sourceCoordinate: { lng: 0, lat: 0 },
        search: '',
        sortBy: OutletSortEnum.proximity,
        onlyFavorites: false,
        requiredFilters: [],
        nonRequiredFilters: [],
        cityId: '',
        neighbourhoods: [],
        categoryId: '',
        outletIds: [],
        merchantId: '',
        tabNumber: 0,
        merchantIds: [],
        profileId: 'profile',
        shariahOnly: true,
      };

      const result = await outletController.getSpecificOutlet('user123', mockRequest);

      expect(result.data).toEqual(mockOutlet);
      expect(discoveryService.getSpecificOutlet).toHaveBeenCalledWith('user123', mockRequest);
    });
  });

  describe('getOutletReview', () => {
    it('should return outlet review', async () => {
      const mockReview = { rating: 4.5, comments: 'Great place!' };
      (discoveryService.getOutletReview as jest.Mock).mockResolvedValue(mockReview);

      const req = { headers: { language: 'en' } };
      const result = await outletController.getOutletReview('outlet1', req as any);

      expect(result.data).toEqual(mockReview);
      expect(discoveryService.getOutletReview).toHaveBeenCalledWith('outlet1', req.headers.language);
    });
  });

  describe('getSubCategoriesHasOutlet', () => {
    it('should return sub-categories', async () => {
      const mockSubCategories = [{ id: 'sub1', name: 'Sub Category 1' }];
      (categoryService.getSubCategoriesHasOutlet as jest.Mock).mockResolvedValue(mockSubCategories);

      const req = { headers: { language: 'en' } };
      const result = await outletController.getSubCategoriesHasOutlet('category1', 'city1', req as any);

      expect(result.data).toEqual(mockSubCategories);
      expect(categoryService.getSubCategoriesHasOutlet).toHaveBeenCalledWith('category1', 'city1', req.headers.language);
    });
  });

  describe('outlets', () => {
    it('should return outlet list', async () => {
      const mockOutlets = [{ id: 'outlet1', name: 'Outlet A' }];
      (discoveryService.getOutletV3 as jest.Mock).mockResolvedValue(mockOutlets);

      const mockRequest: GetOutletRequestDto = {
        pageIndex: 0,
        pageSize: 0,
        sourceCoordinate: { lng: 0, lat: 0 },
        search: '',
        sortBy: OutletSortEnum.proximity,
        onlyFavorites: false,
        requiredFilters: [],
        nonRequiredFilters: [],
        cityId: '',
        neighbourhoods: [],
        categoryId: '',
        outletIds: [],
        merchantId: '',
        tabNumber: 0,
        merchantIds: [],
        profileId: 'profile',
        shariahOnly: true,
      };
      const req = { headers: { language: 'en' } };

      const result = await outletController.outlets(mockRequest, req as any);

      expect(result.data).toEqual(mockOutlets);
      expect(discoveryService.getOutletV3).toHaveBeenCalledWith(mockRequest, req.headers.language);
    });
  });
});
