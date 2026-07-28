import { Test, TestingModule } from '@nestjs/testing';
import { GooglePlacesService } from 'src/google-places/services/google-places.service';
import { Area } from 'src/area/models/area.model';
import { Neighbourhood } from 'src/neighbourhood/models/neighbourhood.model';
import { getModelToken } from '@nestjs/sequelize';
import { HttpException } from '@nestjs/common';
import { AreaService } from '../area.service';
import { ConfigService } from '@nestjs/config';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

describe('AreaService', () => {
  let service: AreaService;
  let googlePlacesService: GooglePlacesService;
  let areaModel: any;
  let neighbourhoodModel: any;

  beforeEach(async () => {
    const mockAreaModel = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const mockNeighbourhoodModel = {
      create: jest.fn(),
      update: jest.fn(),
    };

    const mockGooglePlacesService = {
      getCityNameFromCoordinates: jest.fn().mockResolvedValue(['Test City', 'Test Country']),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue({ QATAR_CITY_ID: 'qatar-city-id-123' }),
    };

    const mockLogger = {
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AreaService,
        {
          provide: getModelToken(Area),
          useValue: mockAreaModel,
        },
        {
          provide: getModelToken(Neighbourhood),
          useValue: mockNeighbourhoodModel,
        },
        {
          provide: GooglePlacesService,
          useValue: mockGooglePlacesService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CustomPinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<AreaService>(AreaService);
    googlePlacesService = module.get<GooglePlacesService>(GooglePlacesService);
    areaModel = module.get<typeof Area>(getModelToken(Area));
    neighbourhoodModel = module.get<typeof Neighbourhood>(getModelToken(Neighbourhood));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAreas', () => {
    it('should return a list of areas', async () => {
      const mockData = [
        {
          toJSON: () => ({
            cityId: 1,
            city: 'Test City',
            isDefault: false,
            neighbourhoods: [{ neighbourhoodId: 1, neighbourhood: 'Test Neighbourhood' }],
          }),
        },
      ];

      areaModel.findAll.mockResolvedValue(mockData);

      const result = await service.findAreas();
      expect(result).toEqual(mockData.map(item => item.toJSON()));
      expect(areaModel.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { isVirtual: false } }));
    });
  });

  describe('findCities', () => {
    it('should return a list of cities', async () => {
      const mockData = [
        {
          toJSON: () => ({
            id: 1,
            city: 'Test City',
            isDefault: false,
          }),
        },
      ];

      areaModel.findAll.mockResolvedValue(mockData);

      const result = await service.findCities();
      expect(result).toEqual(mockData.map(item => item.toJSON()));
    });
  });

  describe('findCitiesWithCoordicatesDefault', () => {
    it('should return cities with names translated based on preferred language', async () => {
      const mockCities = [
        {
          toJSON: () => ({
            id: 1,
            city: 'Abu Dhabi',
            area_name_ar: 'أبو ظبي',
            isDefault: false,
          }),
        },
        {
          toJSON: () => ({
            id: 2,
            city: 'Dubai',
            area_name_ar: 'دبي',
            isDefault: false,
          }),
        },
      ];

      areaModel.findAll.mockResolvedValue(mockCities);

      const resultAr = await service.findCitiesWithCoordicatesDefault(123, 456, 'ar');
      expect(resultAr[0]['city']).toBe('أبو ظبي');
      expect(resultAr[1]['city']).toBe('دبي');
    });

    it('should return cities without updating default city when latitude and longitude are not provided', async () => {
      const mockCities = [
        {
          toJSON: () => ({
            id: 1,
            city: 'Abu Dhabi',
            area_name_ar: 'أبو ظبي',
            isDefault: false,
          }),
        },
      ];

      areaModel.findAll.mockResolvedValue(mockCities);
      const updateDefaultCitySpy = jest.spyOn(service as any, 'updateDefaultCity');
      const result = await service.findCitiesWithCoordicatesDefault(null, null, 'en');
      expect(updateDefaultCitySpy).not.toHaveBeenCalled();
      expect(result[0]['city']).toBe('Abu Dhabi');
    });

    it('should mark the matching city as default based on coordinates', async () => {
      const mockCities = [
        {
          toJSON: () => ({
            id: 1,
            city: 'Abu Dhabi',
            area_name_ar: 'أبو ظبي',
            isDefault: false,
          }),
        },
        {
          toJSON: () => ({
            id: 2,
            city: 'Dubai',
            area_name_ar: 'دبي',
            isDefault: false,
          }),
        },
      ];

      const transformedMockCities = mockCities.map(city => city.toJSON());

      areaModel.findAll.mockResolvedValue(mockCities);
      jest.spyOn(service['googlePlacesService'], 'getCityNameFromCoordinates').mockResolvedValue('Abu Dhabi');

      const result = await service.findCitiesWithCoordicatesDefault(24.4539, 54.3773, 'en');

      expect(result.find(city => city['city'] === 'Abu Dhabi')?.isDefault).toBe(true);
      expect(result.find(city => city['city'] === 'Dubai')?.isDefault).toBe(false);
    });
  });

  describe('upsertNeighbourhood', () => {
    it('should create a new neighbourhood', async () => {
      const request = {
        neighbourhoodId: null,
        neighbourhoodName: 'New Neighbourhood',
        neighbourhoodNameAr: 'حي جديد',
        areaId: '123',
      };

      neighbourhoodModel.create.mockResolvedValue({});

      const result = await service.upsertNeighbourhood(request, {} as any);
      expect(result).toEqual({ message: 'Neighbourhood created successfully' });
    });

    it('should update an existing neighbourhood', async () => {
      const request = {
        neighbourhoodId: '1',
        neighbourhoodName: 'Updated Neighbourhood',
        neighbourhoodNameAr: 'حي محدث',
        areaId: '123',
      };

      neighbourhoodModel.update.mockResolvedValue([1]);

      const result = await service.upsertNeighbourhood(request, {} as any);
      expect(result).toEqual({ message: 'Neighbourhood updated successfully' });
    });

    it('should throw an error if create fails', async () => {
      const request = {
        neighbourhoodId: null,
        neighbourhoodName: 'New Neighbourhood',
        neighbourhoodNameAr: 'حي جديد',
        areaId: '123',
      };

      neighbourhoodModel.create.mockRejectedValue(new Error('Database error'));

      await expect(service.upsertNeighbourhood(request, {} as any)).rejects.toThrow(HttpException);

      try {
        await service.upsertNeighbourhood(request, {} as any);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.getResponse()).toBe('Something went wrong while updating neighbourhood');
      }
    });

    it('should throw an error if update fails', async () => {
      const request = {
        neighbourhoodId: '1',
        neighbourhoodName: 'Updated Neighbourhood',
        neighbourhoodNameAr: 'حي محدث',
        areaId: '123',
      };

      neighbourhoodModel.update.mockRejectedValue(new Error('Database error'));

      await expect(service.upsertNeighbourhood(request, {} as any)).rejects.toThrow(HttpException);

      try {
        await service.upsertNeighbourhood(request, {} as any);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.getResponse()).toBe('Something went wrong while updating neighbourhood');
      }
    });
  });

  describe('findAllAreas', () => {
    it('should return all areas with their neighbourhoods', async () => {
      const mockAreas = [
        {
          area_id: '1',
          area_name: 'Area A',
          isDefault: true,
          Neighbourhoods: [
            {
              neighbourhoodId: '101',
              neighbourhood_name: 'Neighbourhood X',
              neighbourhood_name_ar: 'حي X',
            },
          ],
          toJSON: function () {
            return {
              cityId: this.area_id,
              city: this.area_name,
              isDefault: this.isDefault,
              Neighbourhoods: this.Neighbourhoods.map(n => ({
                neighbourhoodId: n.neighbourhoodId,
                neighbourhood: n.neighbourhood_name,
                neighbourhoodAr: n.neighbourhood_name_ar,
              })),
            };
          },
        },
      ];

      areaModel.findAll.mockResolvedValue(mockAreas);

      const result = await service.findAllAreas();

      expect(areaModel.findAll).toHaveBeenCalled();
      expect(result).toEqual([
        {
          cityId: '1',
          city: 'Area A',
          isDefault: true,
          Neighbourhoods: [{ neighbourhoodId: '101', neighbourhood: 'Neighbourhood X', neighbourhoodAr: 'حي X' }],
        },
      ]);
    });

    it('should return an empty array when no areas are found', async () => {
      areaModel.findAll.mockResolvedValue([]);

      const result = await service.findAllAreas();

      expect(areaModel.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('findAllCityNames', () => {
    it('should return all city names with id and name attributes', async () => {
      const mockCities = [
        { area_id: '1', area_name: 'City A' },
        { area_id: '2', area_name: 'City B' },
      ];

      areaModel.findAll.mockResolvedValue(mockCities);

      const result = await service.findAllCityNames();

      expect(areaModel.findAll).toHaveBeenCalledWith({
        attributes: [
          ['area_id', 'id'],
          ['area_name', 'name'],
        ],
        order: [['area_name', 'ASC']],
      });
      expect(result).toEqual(mockCities);
    });
  });

  describe('findCitiesWithCoordicatesDefaultIncludingQatar', () => {
    it('should return cities without removing Qatar', async () => {
      const mockCities = [
        {
          toJSON: () => ({ id: '1', city: 'Dubai', area_name_ar: 'دبي', isDefault: false }),
        },
        {
          toJSON: () => ({ id: 'qatar-city-id-123', city: 'Qatar', area_name_ar: 'قطر', isDefault: false }),
        },
      ];

      areaModel.findAll.mockResolvedValue(mockCities);

      const result = await service.findCitiesWithCoordicatesDefaultIncludingQatar(null, null, 'en');

      expect(result).toHaveLength(2);
      expect(result.some((c: any) => c.id === 'qatar-city-id-123')).toBe(true);
    });
  });

  describe('findCitiesWithCoordicatesDefault - removeQatarCity', () => {
    it('should remove Qatar city from result when qatarCityId matches', async () => {
      const mockCities = [
        {
          toJSON: () => ({ id: '1', city: 'Dubai', area_name_ar: 'دبي', isDefault: false }),
        },
        {
          toJSON: () => ({ id: 'qatar-city-id-123', city: 'Qatar', area_name_ar: 'قطر', isDefault: false }),
        },
      ];

      areaModel.findAll.mockResolvedValue(mockCities);

      const result = await service.findCitiesWithCoordicatesDefault(null, null, 'en');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
      expect(result.every((c: any) => c.id !== 'qatar-city-id-123')).toBe(true);
    });
  });

  describe('findAllCities', () => {
    it('should return all cities', async () => {
      const mockCities = [
        {
          area_id: '1',
          area_name: 'City A',
          isDefault: true,
          toJSON: function () {
            return { id: this.area_id, city: this.area_name, isDefault: this.isDefault };
          },
        },
        {
          area_id: '2',
          area_name: 'City B',
          isDefault: false,
          toJSON: function () {
            return { id: this.area_id, city: this.area_name, isDefault: this.isDefault };
          },
        },
      ];

      areaModel.findAll.mockResolvedValue(mockCities);

      const result = await service.findAllCities();

      expect(areaModel.findAll).toHaveBeenCalledWith({
        attributes: [['area_id', 'id'], ['area_name', 'city'], 'isDefault'],
        order: [['area_name', 'ASC']],
      });

      expect(result).toEqual([
        { id: '1', city: 'City A', isDefault: true },
        { id: '2', city: 'City B', isDefault: false },
      ]);
    });

    it('should return an empty array when no cities are found', async () => {
      areaModel.findAll.mockResolvedValue([]);

      const result = await service.findAllCities();

      expect(areaModel.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  it('should return the city with given areaId', async () => {
    const mockAreaId = '123';
    const mockResult = {
      area_id: '123',
      area_name: 'Dubai',
      isDefault: true,
    };

    areaModel.findOne = jest.fn().mockResolvedValue(mockResult);

    const result = await service.findById(mockAreaId);

    expect(areaModel.findOne).toHaveBeenCalledWith({
      attributes: [['area_id', 'cityId'], ['area_name', 'city'], 'isDefault'],
      where: { areaId: mockAreaId },
    });

    expect(result).toBe(mockResult);
  });
});
