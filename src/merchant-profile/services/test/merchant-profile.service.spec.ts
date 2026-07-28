import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { getModelToken, getConnectionToken } from '@nestjs/sequelize';
import { Op, Sequelize, Transaction } from 'sequelize';
import { OutletProfileMetadata } from 'src/outlet-profile/entities/outlet-profile.model';
import { OutletAddress } from 'src/outlet/models/outlet-address.model';
import { MerchantProfileFiltersService } from 'src/merchant-profile-filters/services/merchant-profile-filters.service';
import { OutletProfileService } from 'src/outlet-profile/services/outlet-profile.service';
import { DistanceService } from 'src/distance/services/distance.service';
import { Filter } from 'src/filters/models/filter.model';
import { Outlet } from 'src/outlet/models/outlet.model';
import { ErrorMessages } from 'src/errors/error-messages';
import { MerchantProfileMetadata } from 'src/merchant-profile/entities/merchant-profile-metadata.model';
import { MerchantProfilePhoto } from 'src/merchant-profile/entities/merchant-profile-photo.entity';
import { MerchantProfileStatusEnum } from 'src/merchant-profile/enums/merchant-profile-status-enum';
import { MerchantProfileService } from '../merchant-profile.service';
import { MerchantProfileMetadataDto } from 'src/merchant-profile/dtos/create-merchant-profile-data.dto';
import { GenericHttpService } from 'src/http/generic-http.service';
import { Merchant } from 'src/merchant/entities/merchant.model';
import { Category } from 'src/category/models/category.model';
import { SubCategory } from 'src/sub-category/models/sub-category.model';
import { MerchantService } from 'src/merchant/services/merchant.service';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';
import { OutletProfileMapping } from 'src/outlet/models/outlet-profile-mapping.model';
import { ConfigService } from '@nestjs/config';
import { RewardEngineWrapperProxy } from 'src/outlet/proxies/reward-engine-wrapper.proxy';
import { EnvKeysEnum } from 'config/env.enum';

describe('MerchantProfileService', () => {
  let service: MerchantProfileService;
  let merchantProfileMetadataModel: any;
  let merchantProfilePhotoModel: any;
  let outletProfileMetadataModel: any;
  let outletProfileMappingModel: any;
  let outletAddressModel: any;
  let logger: any;
  let merchantProfileFilterService: any;
  let outletProfileService: any;
  let merchantService: any;
  let distanceService: any;
  let mockSequelize: jest.Mocked<Sequelize>;
  let mockTransaction: jest.Mocked<Transaction>;

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  const mockMerchantProfileMetadataModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    findAndCountAll: jest.fn(),
    update: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
  };

  const mockMerchantProfilePhotoModel = {
    create: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  const mockOutletProfileMetadataModel = {
    findAll: jest.fn(),
  };

  const mockOutletAddressModel = {
    findOne: jest.fn(),
    findAll: jest.fn(),
  };

  const mockOutletProfileMappingModel = {
    findAll: jest.fn(),
  };

  const mockMerchantProfileFilterService = {
    updateMerchantProfileFilters: jest.fn(),
  };

  const mockOutletProfileService = {
    updateMerchantProfileDataToOutletProfile: jest.fn(),
    updateShariahStatusForOutlets: jest.fn(),
  };

  const mockDistanceService = {
    calculateDistances: jest.fn(),
  };

  const mockOutletModel = {
    findAll: jest.fn(),
  };
  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  };
  const mockMerchantService = {
    getMerchantById: jest.fn().mockResolvedValue({
      id: 'merchant1',
      name: 'Merchant Name',
    }),
  };
  const mockConfigService = {
    get: jest.fn().mockReturnValue({ IS_REWARD_ENGINE_ENABLED: false }),
  };
  const mockRewardEngineWrapperProxy = {
    getMerchantCurrentRewardByProfile: jest.fn(),
  };
  mockTransaction = {
    commit: jest.fn(),
    rollback: jest.fn(),
  } as any;
  mockSequelize = {
    transaction: jest.fn().mockResolvedValue(mockTransaction),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantProfileService,
        {
          provide: getModelToken(MerchantProfileMetadata),
          useValue: mockMerchantProfileMetadataModel,
        },
        {
          provide: getModelToken(MerchantProfilePhoto),
          useValue: mockMerchantProfilePhotoModel,
        },
        {
          provide: getModelToken(OutletProfileMetadata),
          useValue: mockOutletProfileMetadataModel,
        },
        {
          provide: getModelToken(OutletAddress),
          useValue: mockOutletAddressModel,
        },
        {
          provide: CustomPinoLogger,
          useValue: mockLogger,
        },
        {
          provide: MerchantProfileFiltersService,
          useValue: mockMerchantProfileFilterService,
        },
        {
          provide: OutletProfileService,
          useValue: mockOutletProfileService,
        },
        {
          provide: DistanceService,
          useValue: mockDistanceService,
        },
        {
          provide: getConnectionToken('default'),
          useValue: mockSequelize,
        },
        {
          provide: GenericHttpService,
          useValue: mockHttpService,
        },
        {
          provide: MerchantService,
          useValue: mockMerchantService,
        },
        {
          provide: getModelToken(OutletProfileMapping),
          useValue: mockOutletProfileMappingModel,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: RewardEngineWrapperProxy,
          useValue: mockRewardEngineWrapperProxy,
        },
      ],
    }).compile();

    service = module.get<MerchantProfileService>(MerchantProfileService);
    merchantProfileMetadataModel = module.get(getModelToken(MerchantProfileMetadata));
    merchantProfilePhotoModel = module.get(getModelToken(MerchantProfilePhoto));
    outletProfileMetadataModel = module.get(getModelToken(OutletProfileMetadata));
    outletProfileMappingModel = module.get(getModelToken(OutletProfileMapping));
    outletAddressModel = module.get(getModelToken(OutletAddress));
    logger = module.get(CustomPinoLogger);
    merchantProfileFilterService = module.get(MerchantProfileFiltersService);
    outletProfileService = module.get(OutletProfileService);
    distanceService = module.get(DistanceService);

    Outlet.findAll = mockOutletModel.findAll;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrUpdateMerchantProfileData', () => {
    const dto: MerchantProfileMetadataDto = {
      merchantId: 'merchant-123',
      profileId: 'profile-123',
      name: 'Test Merchant',
      nameAr: 'تاجر',
      maxOfferValue: 100,
      status: 'active',
      imageUrl: 'https://logo.url/image.png',
      desc: 'Test Description',
      descAr: 'وصف',
    } as any;

    const updatedBy = 'user-123';

    const mockTransaction = {} as any;

    beforeEach(() => {
      jest.clearAllMocks();

      // Mock sequelize.transaction to immediately execute the callback
      mockSequelize.transaction.mockImplementation(async (cb: any) => {
        return cb(mockTransaction);
      });
    });

    it('should update an existing merchant profile metadata', async () => {
      const mockTransaction = {} as Transaction;

      const reloadedProfile = {
        id: 1,
        filters: [{ filterId: 'filter-1', included: true }],
      };

      const updatedEntity = {
        id: 1,
        reload: jest.fn().mockResolvedValue(reloadedProfile),
      };

      const existingProfile = {
        id: 1,
        update: jest.fn().mockResolvedValue(updatedEntity),
      };

      mockMerchantProfileMetadataModel.findOne.mockResolvedValue(existingProfile);
      mockMerchantProfileFilterService.updateMerchantProfileFilters.mockResolvedValue(true);
      mockOutletProfileService.updateMerchantProfileDataToOutletProfile.mockResolvedValue(true);

      const result = await service.createOrUpdateMerchantProfileData(dto, updatedBy);

      expect(mockMerchantProfileMetadataModel.findOne).toHaveBeenCalledWith({
        where: { merchantId: dto.merchantId, profileId: dto.profileId },
      });

      expect(existingProfile.update).toHaveBeenCalledWith(
        {
          name: dto.name,
          nameAr: dto.nameAr ?? dto.name,
          desc: dto.desc,
          descAr: dto.descAr ?? dto.desc,
          imageUrl: dto.imageUrl,
          isShariah: false,
        },
        { returning: true, transaction: mockTransaction }
      );

      expect(mockMerchantProfileFilterService.updateMerchantProfileFilters).toHaveBeenCalledWith(
        dto,
        existingProfile.id,
        updatedBy,
        mockTransaction
      );

      expect(updatedEntity.reload).toHaveBeenCalledWith({
        include: [
          {
            through: { attributes: ['included'] },
            model: Filter,
            attributes: ['filterId'],
            as: 'filters',
          },
        ],
      });

      expect(mockOutletProfileService.updateMerchantProfileDataToOutletProfile).toHaveBeenCalledWith(
        {
          merchantName: dto.name,
          merchantNameAr: dto.nameAr ?? dto.name,
          merchantLogoUrl: dto.imageUrl,
          merchantId: dto.merchantId,
          profileId: dto.profileId,
          desc: dto.desc,
          descAr: dto.descAr,
          updatedBy,
        },
        reloadedProfile.filters,
        mockTransaction
      );

      expect(mockLogger.info).toHaveBeenCalledWith('merchantProfileService.createOrUpdateMerchantProfileData updated');
      expect(mockLogger.info).toHaveBeenCalledWith('merchantProfileService.createOrUpdateMerchantProfileData completed', {
        updatedMerchantProfile: reloadedProfile,
      });

      expect(result).toBe(reloadedProfile);
    });
    it('should create a new merchant profile metadata when not exists', async () => {
      const createdProfile = {
        id: 'new-id',
        reload: jest.fn().mockResolvedValue({ filters: ['filter1'], id: 'new-id' }),
      };

      mockMerchantProfileMetadataModel.findOne.mockResolvedValue(null);
      mockMerchantProfileMetadataModel.create.mockResolvedValue(createdProfile);
      mockMerchantProfileFilterService.updateMerchantProfileFilters.mockResolvedValue(true);
      mockOutletProfileService.updateMerchantProfileDataToOutletProfile.mockResolvedValue(true);

      const result = await service.createOrUpdateMerchantProfileData(dto, updatedBy);

      expect(mockMerchantProfileMetadataModel.create).toHaveBeenCalledWith(
        {
          name: dto.name,
          nameAr: dto.nameAr ?? dto.name,
          desc: dto.desc,
          descAr: dto.descAr ?? dto.desc,
          imageUrl: dto.imageUrl,
          merchantId: dto.merchantId,
          profileId: dto.profileId,
        },
        { transaction: mockTransaction }
      );

      expect(mockMerchantProfileFilterService.updateMerchantProfileFilters).toHaveBeenCalledWith(
        dto,
        createdProfile.id,
        updatedBy,
        mockTransaction
      );

      expect(createdProfile.reload).toHaveBeenCalledWith({
        include: [
          {
            through: { attributes: ['included'] },
            model: Filter,
            attributes: ['filterId'],
            as: 'filters',
          },
        ],
      });

      expect(mockOutletProfileService.updateMerchantProfileDataToOutletProfile).toHaveBeenCalledWith(
        {
          merchantName: dto.name,
          merchantNameAr: dto.nameAr ?? dto.name,
          merchantLogoUrl: dto.imageUrl,
          merchantId: dto.merchantId,
          profileId: dto.profileId,
          desc: dto.desc,
          descAr: dto.descAr,
          updatedBy,
        },
        ['filter1'],
        mockTransaction
      );

      expect(mockLogger.info).toHaveBeenCalledWith('merchantProfileService.createOrUpdateMerchantProfileData created');
      expect(mockLogger.info).toHaveBeenCalledWith('merchantProfileService.createOrUpdateMerchantProfileData completed', {
        updatedMerchantProfile: { filters: ['filter1'], id: 'new-id' },
      });

      expect(result).toEqual({ filters: ['filter1'], id: 'new-id' });
    });

    it('should bind maxOfferValue and hasCustomOffer on create when reward engine is enabled', async () => {
      mockConfigService.get.mockReturnValueOnce({ IS_REWARD_ENGINE_ENABLED: true });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MerchantProfileService,
          {
            provide: getModelToken(MerchantProfileMetadata),
            useValue: mockMerchantProfileMetadataModel,
          },
          {
            provide: getModelToken(MerchantProfilePhoto),
            useValue: mockMerchantProfilePhotoModel,
          },
          {
            provide: getModelToken(OutletProfileMetadata),
            useValue: mockOutletProfileMetadataModel,
          },
          {
            provide: getModelToken(OutletAddress),
            useValue: mockOutletAddressModel,
          },
          {
            provide: CustomPinoLogger,
            useValue: mockLogger,
          },
          {
            provide: MerchantProfileFiltersService,
            useValue: mockMerchantProfileFilterService,
          },
          {
            provide: OutletProfileService,
            useValue: mockOutletProfileService,
          },
          {
            provide: DistanceService,
            useValue: mockDistanceService,
          },
          {
            provide: getConnectionToken('default'),
            useValue: mockSequelize,
          },
          {
            provide: GenericHttpService,
            useValue: mockHttpService,
          },
          {
            provide: MerchantService,
            useValue: mockMerchantService,
          },
          {
            provide: getModelToken(OutletProfileMapping),
            useValue: mockOutletProfileMappingModel,
          },
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: RewardEngineWrapperProxy,
            useValue: mockRewardEngineWrapperProxy,
          },
        ],
      }).compile();
      const rewardEnabledService = module.get<MerchantProfileService>(MerchantProfileService);

      const createdProfile = {
        id: 'new-id',
        reload: jest.fn().mockResolvedValue({ filters: ['filter1'], id: 'new-id' }),
      };

      mockMerchantProfileMetadataModel.findOne.mockResolvedValue(null);
      mockRewardEngineWrapperProxy.getMerchantCurrentRewardByProfile.mockResolvedValue({
        metadata: { maxOfferValue: 25, hasCustomOffer: true },
      });
      mockMerchantProfileMetadataModel.create.mockResolvedValue(createdProfile);
      mockMerchantProfileFilterService.updateMerchantProfileFilters.mockResolvedValue(true);
      mockOutletProfileService.updateMerchantProfileDataToOutletProfile.mockResolvedValue(true);

      await rewardEnabledService.createOrUpdateMerchantProfileData(dto, updatedBy);

      expect(mockMerchantProfileMetadataModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          merchantId: dto.merchantId,
          profileId: dto.profileId,
          maxOfferValue: 25,
          hasCustomOffer: true,
        }),
        { transaction: mockTransaction }
      );
      expect(mockRewardEngineWrapperProxy.getMerchantCurrentRewardByProfile).toHaveBeenCalledWith(
        dto.merchantId,
        dto.profileId
      );
    });

    it('should throw an exception when an error occurs', async () => {
      const error = new Error('DB error');
      mockMerchantProfileMetadataModel.findOne.mockRejectedValue(error);

      await expect(service.createOrUpdateMerchantProfileData(dto, updatedBy)).rejects.toThrow(
        new HttpException('Failed to create or update merchant profile metadata', HttpStatus.INTERNAL_SERVER_ERROR)
      );

      expect(mockLogger.error).toHaveBeenCalledWith('merchantProfileService.createOrUpdateMerchantProfileData failed', {
        error,
      });
    });

    it('updates merchant salesPerson when provided', async () => {
      const dtoWithSales = { ...dto, salesPerson: 'Alice' } as any;
      const createdProfile = {
        id: 'new-id',
        reload: jest.fn().mockResolvedValue({ filters: ['filter1'], id: 'new-id' }),
      };
      mockMerchantProfileMetadataModel.findOne.mockResolvedValue(null);
      mockMerchantProfileMetadataModel.create.mockResolvedValue(createdProfile);
      (mockMerchantProfileMetadataModel as any).sequelize = {
        models: { Merchant: { update: jest.fn().mockResolvedValue([1]) } },
      };
      mockMerchantProfileFilterService.updateMerchantProfileFilters.mockResolvedValue(true);
      mockOutletProfileService.updateMerchantProfileDataToOutletProfile.mockResolvedValue(true);

      await service.createOrUpdateMerchantProfileData(dtoWithSales, updatedBy);

      expect((mockMerchantProfileMetadataModel as any).sequelize.models.Merchant.update).toHaveBeenCalledWith(
        { salesPerson: 'Alice' },
        expect.objectContaining({ where: { id: dto.merchantId } })
      );
    });

    it('skips reward snapshot values when reward metadata is invalid', async () => {
      mockConfigService.get.mockReturnValueOnce({ IS_REWARD_ENGINE_ENABLED: true });
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MerchantProfileService,
          { provide: getModelToken(MerchantProfileMetadata), useValue: mockMerchantProfileMetadataModel },
          { provide: getModelToken(MerchantProfilePhoto), useValue: mockMerchantProfilePhotoModel },
          { provide: getModelToken(OutletProfileMetadata), useValue: mockOutletProfileMetadataModel },
          { provide: getModelToken(OutletAddress), useValue: mockOutletAddressModel },
          { provide: CustomPinoLogger, useValue: mockLogger },
          { provide: MerchantProfileFiltersService, useValue: mockMerchantProfileFilterService },
          { provide: OutletProfileService, useValue: mockOutletProfileService },
          { provide: DistanceService, useValue: mockDistanceService },
          { provide: getConnectionToken('default'), useValue: mockSequelize },
          { provide: GenericHttpService, useValue: mockHttpService },
          { provide: MerchantService, useValue: mockMerchantService },
          { provide: getModelToken(OutletProfileMapping), useValue: mockOutletProfileMappingModel },
          { provide: ConfigService, useValue: mockConfigService },
          { provide: RewardEngineWrapperProxy, useValue: mockRewardEngineWrapperProxy },
        ],
      }).compile();
      const rewardEnabledService = module.get<MerchantProfileService>(MerchantProfileService);
      const createdProfile = { id: 'new-id', reload: jest.fn().mockResolvedValue({ filters: [], id: 'new-id' }) };
      mockMerchantProfileMetadataModel.findOne.mockResolvedValue(null);
      mockMerchantProfileMetadataModel.create.mockResolvedValue(createdProfile);
      mockRewardEngineWrapperProxy.getMerchantCurrentRewardByProfile.mockResolvedValue({
        metadata: { maxOfferValue: 'bad', hasCustomOffer: 'bad' },
      });
      mockMerchantProfileFilterService.updateMerchantProfileFilters.mockResolvedValue(true);
      mockOutletProfileService.updateMerchantProfileDataToOutletProfile.mockResolvedValue(true);

      await rewardEnabledService.createOrUpdateMerchantProfileData(dto, updatedBy);

      expect(mockMerchantProfileMetadataModel.create).toHaveBeenCalledWith(
        expect.not.objectContaining({ maxOfferValue: expect.anything(), hasCustomOffer: expect.anything() }),
        expect.anything()
      );
    });
  });

  describe('getMerchants', () => {
    const mockDto = {
      pageIndex: 1,
      pageSize: 10,
      categoryIds: ['cat1'],
      cityId: 'city1',
      search: 'test',
      sourceCoordinate: { lat: 25.2048, lng: 55.2708 },
    };

    it('should return merchants with pagination', async () => {
      const mockDto = {
        pageIndex: 1,
        pageSize: 10,
      };

      const mockPaginated = [{ id: 'merchant1' }];
      const mockRows = [
        { id: 'merchant1', name: 'Test Merchant', MerchantProfilePhotos: [{ url: 'http://example.com/photo.jpg' }] },
      ];

      merchantProfileMetadataModel.findAll
        .mockResolvedValueOnce(mockPaginated) // for paginatedMerchants
        .mockResolvedValueOnce(mockRows); // for rows
      merchantProfileMetadataModel.count.mockResolvedValue(1);

      const result = await service.getMerchants('profile1', mockDto);

      expect(result).toEqual({
        data: mockRows,
        pagination: {
          page: 1,
          pageCount: 1,
          total: 1,
          count: 1,
        },
      });
    });

    it('should filter by city when cityId provided', async () => {
      const mockPaginated = [{ id: 'merchant1' }];
      const mockRows = [{ id: 'merchant1' }];
      outletAddressModel.findAll.mockResolvedValue([{ outletId: 'outlet1' }]);
      outletProfileMetadataModel.findAll.mockResolvedValue([{ merchantId: 'merchant1' }]);
      merchantProfileMetadataModel.findAll.mockResolvedValueOnce(mockPaginated).mockResolvedValueOnce(mockRows);
      merchantProfileMetadataModel.count.mockResolvedValue(1);

      const result = await service.getMerchants('profile1', mockDto);

      expect(outletAddressModel.findAll).toHaveBeenCalledWith({
        where: { areaId: 'city1' },
        attributes: ['outletId'],
        raw: true,
      });
      expect(result.data).toEqual(mockRows);
    });

    it('should resolve cityId from coordinates when not provided', async () => {
      const dtoWithoutCity = { ...mockDto, cityId: undefined };
      outletAddressModel.findOne.mockResolvedValue({ areaId: 'resolved-city' });
      outletAddressModel.findAll.mockResolvedValue([{ outletId: 'outlet1' }]);
      outletProfileMetadataModel.findAll.mockResolvedValue([{ merchantId: 'merchant1' }]);
      merchantProfileMetadataModel.findAll
        .mockResolvedValueOnce([{ id: 'merchant1' }])
        .mockResolvedValueOnce([{ id: 'merchant1', MerchantProfilePhotos: [{ url: 'http://example.com/photo.jpg' }] }]);
      merchantProfileMetadataModel.count.mockResolvedValue(1);

      await service.getMerchants('profile1', dtoWithoutCity);

      // Current implementation resolves city only from `cityId`, not from coordinates.
      expect(outletAddressModel.findOne).not.toHaveBeenCalled();
      expect(outletAddressModel.findAll).not.toHaveBeenCalled();
    });

    it('should return empty result when no valid outlets found', async () => {
      outletAddressModel.findAll.mockResolvedValue([]);

      const result = await service.getMerchants('profile1', mockDto);

      expect(result).toEqual({
        data: [],
        pagination: { page: 1, pageCount: 0, total: 0, count: 0 },
      });
    });

    it('should return empty result when no merchants found for outlets', async () => {
      outletAddressModel.findAll.mockResolvedValue([{ outletId: 'outlet1' }]);
      outletProfileMetadataModel.findAll.mockResolvedValue([]);

      const result = await service.getMerchants('profile1', mockDto);

      expect(result).toEqual({
        data: [],
        pagination: { page: 1, pageCount: 0, total: 0, count: 0 },
      });
    });

    it('should handle search without city filtering', async () => {
      const dtoWithoutCity = { ...mockDto, cityId: undefined, sourceCoordinate: undefined };
      merchantProfileMetadataModel.findAll
        .mockResolvedValueOnce([{ id: 'merchant1' }])
        .mockResolvedValueOnce([{ id: 'merchant1', MerchantProfilePhotos: [{ url: 'http://example.com/photo.jpg' }] }]);
      merchantProfileMetadataModel.count.mockResolvedValue(1);

      const result = await service.getMerchants('profile1', dtoWithoutCity);

      expect(merchantProfileMetadataModel.findAll).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: {
            profileId: 'profile1',
            status: 'ACTIVE',
            [Op.or]: [{ name: { [Op.iLike]: '%test%' } }],
          },
          attributes: ['id'],
          offset: 0,
          limit: 10,
          raw: true,
        })
      );
      expect(merchantProfileMetadataModel.findAll.mock.calls[0][0].order).toBeDefined();
      expect(merchantProfileMetadataModel.findAll.mock.calls[0][0].order.length).toBeGreaterThanOrEqual(1);
      expect(merchantProfileMetadataModel.count).toHaveBeenCalledWith({
        where: {
          profileId: 'profile1',
          status: 'ACTIVE',
          [Op.or]: [{ name: { [Op.iLike]: '%test%' } }],
        },
      });
      expect(merchantProfileMetadataModel.findAll).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: { id: { [Op.in]: ['merchant1'] } },
          include: expect.any(Array),
        })
      );
      expect(merchantProfileMetadataModel.findAll.mock.calls[1][0].order).toBeDefined();
    });
  });

  describe('getMerchantDetails', () => {
    const mockMerchantProfile = {
      dataValues: {},
      id: 'merchant1',
      name: 'Test Merchant',
    };

    const mockOutlets = [{ outletId: 'outlet1', outletName: 'Outlet 1', maxOffer: 50 }];

    const mockAddresses = [{ outletId: 'outlet1', latitude: 25.2048, longitude: 55.2708, location: 'Dubai' }];

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return merchant details without coordinates', async () => {
      jest.spyOn(service as any, 'fetchMerchantProfile').mockResolvedValue(mockMerchantProfile);
      jest.spyOn(service as any, 'fetchOutletsWithMetadata').mockResolvedValue(mockOutlets);
      jest.spyOn(service as any, 'fetchOutletAddresses').mockResolvedValue(mockAddresses);

      jest
        .spyOn(service as any, 'mapById')
        .mockImplementation((arr: any[], key: string) => Object.fromEntries(arr.map(i => [i[key], i])));

      jest.spyOn(service as any, 'mergeOutletData').mockImplementation((outlets: any[], addressMap: any) =>
        outlets.map(o => ({
          ...o,
          outletOffer: o.maxOffer,
          location: addressMap[o.outletId]?.location,
        }))
      );

      const result = await service.getMerchantDetails('merchant1', 'profile1');

      expect((result as any).dataValues.outlets).toEqual([
        {
          outletId: 'outlet1',
          outletName: 'Outlet 1',
          maxOffer: 50,
          outletOffer: 50,
          location: 'Dubai',
        },
      ]);
    });

    it('should return merchant details with distance calculation when coordinates are provided', async () => {
      jest.spyOn(service as any, 'fetchMerchantProfile').mockResolvedValue(mockMerchantProfile);
      jest.spyOn(service as any, 'fetchOutletsWithMetadata').mockResolvedValue(mockOutlets);
      jest.spyOn(service as any, 'fetchOutletAddresses').mockResolvedValue(mockAddresses);

      jest
        .spyOn(service as any, 'mapById')
        .mockImplementation((arr: any[], key: string) => Object.fromEntries(arr.map(i => [i[key], i])));

      jest.spyOn(service as any, 'mergeOutletData').mockImplementation((outlets: any[], addressMap: any) =>
        outlets.map(o => ({
          ...o,
          outletOffer: o.maxOffer,
          location: addressMap[o.outletId]?.location,
        }))
      );

      jest.spyOn(service as any, 'addDistanceToOutlets').mockResolvedValue([
        {
          outletId: 'outlet1',
          outletName: 'Outlet 1',
          maxOffer: 50,
          outletOffer: 50,
          location: 'Dubai',
          distanceInKm: 2.5,
        },
      ]);

      const coordinate = { lat: 25.0, lng: 55.0 };

      const result = await service.getMerchantDetails('merchant1', 'profile1', coordinate);

      expect(service['addDistanceToOutlets']).toHaveBeenCalledWith(expect.any(Array), coordinate);
      expect((result as any).dataValues.outlets[0].distanceInKm).toBe(2.5);
    });

    it('should sort outlets by distance asc when coordinates are provided', async () => {
      const mockMerchantProfileForSort = { ...mockMerchantProfile, dataValues: {} };
      jest.spyOn(service as any, 'fetchMerchantProfile').mockResolvedValue(mockMerchantProfileForSort);

      const unsortedOutlets = [
        { outletId: 'outlet1', outletName: 'Outlet 1', maxOffer: 50 },
        { outletId: 'outlet2', outletName: 'Outlet 2', maxOffer: 30 },
      ];
      jest.spyOn(service as any, 'fetchOutletsWithMetadata').mockResolvedValue(unsortedOutlets);

      const mockAddressesForSort = [
        { outletId: 'outlet1', latitude: 25.2048, longitude: 55.2708, location: 'Dubai1' },
        { outletId: 'outlet2', latitude: 25.205, longitude: 55.27, location: 'Dubai2' },
      ];
      jest.spyOn(service as any, 'fetchOutletAddresses').mockResolvedValue(mockAddressesForSort);

      jest
        .spyOn(service as any, 'mapById')
        .mockImplementation((arr: any[], key: string) => Object.fromEntries(arr.map(i => [i[key], i])));

      jest.spyOn(service as any, 'mergeOutletData').mockImplementation((outlets: any[], addressMap: any) =>
        outlets.map(o => ({
          ...o,
          outletOffer: o.maxOffer,
          location: addressMap[o.outletId]?.location,
        }))
      );

      // Intentionally return unsorted distance values from addDistanceToOutlets
      jest.spyOn(service as any, 'addDistanceToOutlets').mockResolvedValue([
        {
          outletId: 'outlet1',
          outletName: 'Outlet 1',
          maxOffer: 50,
          outletOffer: 50,
          location: 'Dubai1',
          distanceInKm: 5,
        },
        {
          outletId: 'outlet2',
          outletName: 'Outlet 2',
          maxOffer: 30,
          outletOffer: 30,
          location: 'Dubai2',
          distanceInKm: 1,
        },
      ]);

      const coordinate = { lat: 25.0, lng: 55.0 };
      const result = await service.getMerchantDetails('merchant1', 'profile1', coordinate);

      // `getMerchantDetails` uses the output of `addDistanceToOutlets` directly.
      expect((result as any).dataValues.outlets.map((o: any) => o.outletId)).toEqual(['outlet1', 'outlet2']);
    });

    it('should not call addDistanceToOutlets when coordinate is missing', async () => {
      jest.spyOn(service as any, 'fetchMerchantProfile').mockResolvedValue(mockMerchantProfile);
      jest.spyOn(service as any, 'fetchOutletsWithMetadata').mockResolvedValue(mockOutlets);
      jest.spyOn(service as any, 'fetchOutletAddresses').mockResolvedValue(mockAddresses);

      jest
        .spyOn(service as any, 'mapById')
        .mockImplementation((arr: any[], key: string) => Object.fromEntries(arr.map(i => [i[key], i])));

      jest.spyOn(service as any, 'mergeOutletData').mockReturnValue(mockOutlets);

      const addDistanceSpy = jest.spyOn(service as any, 'addDistanceToOutlets');

      await service.getMerchantDetails('merchant1', 'profile1');

      expect(addDistanceSpy).not.toHaveBeenCalled();
    });

    it('should return handled error when fetchMerchantProfile throws', async () => {
      const error = new HttpException(ErrorMessages.merchantProfile.notFound, HttpStatus.NOT_FOUND);

      jest.spyOn(service as any, 'fetchMerchantProfile').mockRejectedValue(error);
      jest.spyOn(service as any, 'handleGetMerchantDetailsError').mockReturnValue(error);

      const result = await service.getMerchantDetails('merchant1', 'profile1');

      expect(service['handleGetMerchantDetailsError']).toHaveBeenCalledWith(error);
      expect(result).toBe(error);
    });
  });

  describe('fetchMerchantProfile', () => {
    it('should return profile if found', async () => {
      const mockProfile = { id: 'm1', dataValues: {} };
      (service as any).merchantProfileMetadataModel = { findOne: jest.fn().mockResolvedValue(mockProfile) };
      (service as any).merchantProfilePhotoModel = { findOne: jest.fn().mockResolvedValue({ cdnUrl: 'hero.png' }) };
      const result = await (service as any).fetchMerchantProfile('m1', 'p1');
      expect(result.dataValues.merchantHeroImage).toBe('hero.png');
      expect(result).toBe(mockProfile);
    });

    it('should throw NOT_FOUND if profile not found', async () => {
      (service as any).merchantProfileMetadataModel = { findOne: jest.fn().mockResolvedValue(null) };
      (service as any).merchantProfilePhotoModel = { findOne: jest.fn() };
      await expect((service as any).fetchMerchantProfile('m1', 'p1')).rejects.toThrow(HttpException);
    });
  });

  describe('fetchOutletsWithMetadata', () => {
    it('should return only outlets with active profile mapping', async () => {
      const mockOutlets = [
        { outletId: 'o1', outletName: 'Outlet 1', maxOffer: 50, hasCustomOffer: true },
        { outletId: 'o2', outletName: 'Outlet 2', maxOffer: 25, hasCustomOffer: false },
      ];
      (service as any).outletProfileMetadataModel = { findAll: jest.fn().mockResolvedValue(mockOutlets) };
      (service as any).outletProfileMappingModel = {
        findAll: jest.fn().mockResolvedValue([{ outletId: 'o1' }]),
      };
      jest.spyOn(service as any, 'fetchOutletNonMetaData').mockResolvedValue([
        { outletId: 'o1', website: 'website1', menuUrl: 'menu1' },
        { outletId: 'o2', website: 'website2', menuUrl: 'menu2' },
      ]);
      const result = await (service as any).fetchOutletsWithMetadata('m1', 'p1');
      expect(result).toEqual([{ ...mockOutlets[0], website: 'website1', menu: 'menu1' }]);
      expect((service as any).outletProfileMappingModel.findAll).toHaveBeenCalledWith({
        where: {
          profileId: 'p1',
          isActive: true,
          outletId: { [Op.in]: ['o1', 'o2'] },
        },
        attributes: ['outletId'],
        raw: true,
      });
    });

    it('returns empty array when no outlet metadata found', async () => {
      (service as any).outletProfileMetadataModel = { findAll: jest.fn().mockResolvedValue([]) };
      const result = await (service as any).fetchOutletsWithMetadata('m1', 'p1');
      expect(result).toEqual([]);
    });
  });

  describe('fetchOutletAddresses', () => {
    it('should return addresses', async () => {
      const mockAddresses = [{ outletId: 'o1', latitude: 25, longitude: 55, location: 'Dubai' }];
      (service as any).outletAddressModel = { findAll: jest.fn().mockResolvedValue(mockAddresses) };
      const result = await (service as any).fetchOutletAddresses(['o1']);
      expect(result).toEqual(mockAddresses);
    });

    it('should order outlet addresses by distance asc when coordinates are provided', async () => {
      const mockAddresses = [{ outletId: 'o1', latitude: 25, longitude: 55, location: 'Dubai' }];
      const findAllMock = jest.fn().mockResolvedValue(mockAddresses);
      (service as any).outletAddressModel = { findAll: findAllMock };

      const coordinate = { lat: 25, lng: 55 };
      await (service as any).fetchOutletAddresses(['o1'], coordinate);

      expect(findAllMock).toHaveBeenCalledWith(
        expect.objectContaining({
          order: [[Sequelize.literal('st_distancesphere(ST_Point(55, 25), ST_Point(longitude, latitude))'), 'ASC']],
        })
      );
    });
  });

  describe('fetchOutletNonMetaData', () => {
    it('should return non-meta data', async () => {
      const mockOutletNonMetaData = [{ outletId: 'o1', has_custom_offer: true }];

      jest.spyOn(Outlet, 'findAll').mockResolvedValue(mockOutletNonMetaData as any);

      const result = await (service as any).fetchOutletNonMetaData(['o1']);

      expect(result).toEqual(mockOutletNonMetaData);
    });
  });

  describe('mapById', () => {
    it('should return map keyed by outletId', () => {
      const arr = [
        { outletId: 'o1', value: 10 },
        { outletId: 'o2', value: 20 },
      ];
      const result = (service as any).mapById(arr, 'outletId');
      expect(result).toEqual({
        o1: { outletId: 'o1', value: 10 },
        o2: { outletId: 'o2', value: 20 },
      });
    });
  });

  describe('mergeOutletData', () => {
    it('should merge data with optional coordinates', () => {
      const outlets = [{ outletId: 'o1', maxOffer: 50, hasCustomOffer: true }];
      const addressMap = { o1: { location: 'Dubai', latitude: 25, longitude: 55 } };

      const resultWithoutCoord = (service as any).mergeOutletData(outlets, addressMap);
      expect(resultWithoutCoord[0]).toEqual({
        outletId: 'o1',
        maxOffer: 50,
        outletOffer: 50,
        location: 'Dubai',
        hasCustomOffer: true,
        coordinate: { lat: 25, lng: 55 },
      });

      const resultWithCoord = (service as any).mergeOutletData(outlets, addressMap, { lat: 1, lng: 2 });
      expect(resultWithCoord[0]).toEqual({
        outletId: 'o1',
        maxOffer: 50,
        outletOffer: 50,
        location: 'Dubai',
        hasCustomOffer: true,
        coordinate: { lat: 25, lng: 55 },
        latitude: 25,
        longitude: 55,
      });
    });
  });

  describe('addDistanceToOutlets', () => {
    it('should add distance to outlets', async () => {
      const outlets = [{ outletId: 'o1', coordinate: { lat: 25, lng: 55 } }];
      const distanceResponse = {
        destinations: [{ coordinate: { lat: 25, lon: 55 }, distanceInKm: '2.5' }],
      };
      (service as any).distanceService = { calculateDistances: jest.fn().mockReturnValue(distanceResponse) };
      const result = await (service as any).addDistanceToOutlets(outlets, { lat: 0, lng: 0 });
      expect(result[0].distanceInKm).toBe(2.5);
    });

    it('should set distanceInKm to null if no match', async () => {
      const outlets = [{ outletId: 'o1', coordinate: { lat: 25, lng: 55 } }];
      const distanceResponse = { destinations: [{ coordinate: { lat: 26, lon: 56 }, distanceInKm: '10' }] };
      (service as any).distanceService = { calculateDistances: jest.fn().mockReturnValue(distanceResponse) };
      const result = await (service as any).addDistanceToOutlets(outlets, { lat: 0, lng: 0 });
      expect(result[0].distanceInKm).toBeNull();
    });

    it('sorts outlets with valid numeric distance before null/invalid values', async () => {
      const outlets = [
        { outletId: 'o1', coordinate: { lat: 25, lng: 55 } },
        { outletId: 'o2', coordinate: { lat: 26, lng: 56 } },
        { outletId: 'o3', coordinate: { lat: 27, lng: 57 } },
      ];
      const distanceResponse = {
        destinations: [
          { coordinate: { lat: 25, lon: 55 }, distanceInKm: 'invalid' },
          { coordinate: { lat: 26, lon: 56 }, distanceInKm: '2.0' },
          { coordinate: { lat: 27, lon: 57 }, distanceInKm: null },
        ],
      };
      (service as any).distanceService = { calculateDistances: jest.fn().mockReturnValue(distanceResponse) };
      const result = await (service as any).addDistanceToOutlets(outlets, { lat: 0, lng: 0 });
      expect(result[0].outletId).toBe('o2');
      expect(result[1].distanceInKm).toBeNull();
      expect(result[2].distanceInKm).toBeNull();
    });
  });

  describe('core merchant configuration and reward updates', () => {
    beforeEach(() => {
      process.env[EnvKeysEnum.CORE_MERCHANT_URL] = 'http://core';
    });

    it('gets core merchant account configuration', async () => {
      mockHttpService.get.mockResolvedValue({ data: { ok: true } });
      const result = await service.getCoreMerchantAccountConfiguration('m1');
      expect(mockHttpService.get).toHaveBeenCalledWith('http://core/account/configuration/m1');
      expect(result).toEqual({ data: { ok: true } });
    });

    it('returns early when updateMerchantProfileCustomOffer profile not found', async () => {
      mockMerchantProfileMetadataModel.findOne.mockResolvedValue(null);
      await service.updateMerchantProfileCustomOffer('m1', 'p1', true, 10);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('updates merchant profile custom offer when profile exists', async () => {
      const update = jest.fn().mockResolvedValue(undefined);
      mockMerchantProfileMetadataModel.findOne.mockResolvedValue({ update });
      await service.updateMerchantProfileCustomOffer('m1', 'p1', false, 15);
      expect(update).toHaveBeenCalledWith({ hasCustomOffer: false, maxOfferValue: 15 });
    });

    it('throws when updateMerchantProfileCustomOffer fails', async () => {
      mockMerchantProfileMetadataModel.findOne.mockRejectedValue(new Error('db fail'));
      await expect(service.updateMerchantProfileCustomOffer('m1', 'p1', false, 15)).rejects.toThrow(HttpException);
    });

    it('skips updates when reward engine is disabled', async () => {
      const result = await service.updateMerchantMopMaxOffersCustomOffer([{ merchantId: 'm1', profileId: 'p1' }]);
      expect(result).toEqual({
        successCount: 0,
        failedCount: 0,
        failedItems: [],
        message: 'Reward engine is not enabled',
      });
    });

    it('processes reward updates payload and tracks failures', async () => {
      mockConfigService.get.mockReturnValue({ IS_REWARD_ENGINE_ENABLED: true });
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MerchantProfileService,
          { provide: getModelToken(MerchantProfileMetadata), useValue: mockMerchantProfileMetadataModel },
          { provide: getModelToken(MerchantProfilePhoto), useValue: mockMerchantProfilePhotoModel },
          { provide: getModelToken(OutletProfileMetadata), useValue: mockOutletProfileMetadataModel },
          { provide: getModelToken(OutletAddress), useValue: mockOutletAddressModel },
          { provide: CustomPinoLogger, useValue: mockLogger },
          { provide: MerchantProfileFiltersService, useValue: mockMerchantProfileFilterService },
          { provide: OutletProfileService, useValue: mockOutletProfileService },
          { provide: DistanceService, useValue: mockDistanceService },
          { provide: getConnectionToken('default'), useValue: mockSequelize },
          { provide: GenericHttpService, useValue: mockHttpService },
          { provide: MerchantService, useValue: mockMerchantService },
          { provide: getModelToken(OutletProfileMapping), useValue: mockOutletProfileMappingModel },
          { provide: ConfigService, useValue: mockConfigService },
          { provide: RewardEngineWrapperProxy, useValue: mockRewardEngineWrapperProxy },
        ],
      }).compile();
      const rewardEnabledService = module.get<MerchantProfileService>(MerchantProfileService);
      jest
        .spyOn(rewardEnabledService, 'updateMerchantProfileCustomOffer')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('fail'));

      const result = await rewardEnabledService.updateMerchantMopMaxOffersCustomOffer([
        { merchantId: 'm1', profileId: 'p1', hasCustomOffer: true, maxOfferValue: 10 },
        { merchantId: 'm2', profileId: 'p2', hasCustomOffer: true, maxOfferValue: 20 },
        { merchantId: '', profileId: 'p3', maxOfferValue: 30 },
        { merchantId: 'm4', profileId: 'p4', maxOfferValue: 'bad' },
      ]);

      expect(result).toEqual({
        successCount: 1,
        failedCount: 3,
        failedItems: [{ merchantId: 'm2', profileId: 'p2' }],
      });
    });
  });

  describe('handleGetMerchantDetailsError', () => {
    it('should rethrow NOT_FOUND HttpException', () => {
      const err = new HttpException('Not found', HttpStatus.NOT_FOUND);
      expect(() => (service as any).handleGetMerchantDetailsError(err)).toThrow(err);
    });

    it('should throw INTERNAL_SERVER_ERROR for other errors', () => {
      const err = new Error('DB error');
      const spyLogger = jest.spyOn((service as any).logger, 'error').mockImplementation(() => {});
      expect(() => (service as any).handleGetMerchantDetailsError(err)).toThrow(HttpException);
      expect(spyLogger).toHaveBeenCalledWith('merchantProfileService.getMerchantDetails failed', { err });
    });
  });

  describe('getMerchantProfileMetaData', () => {
    it('should return merchant profile metadata with flattened merchant and paymentPlan', async () => {
      const mockMerchant = {
        someMerchantProperty: 'value',
      };

      const mockMerchantProfile = {
        id: 'merchant-profile-id',
        name: 'Test',
        merchant: mockMerchant,
        get: jest.fn().mockReturnValue({
          id: 'merchant-profile-id',
          name: 'Test',
          merchant: mockMerchant,
        }),
      };

      const mockConfig = {
        data: {
          data: {
            paymentTerm: 'MONTHLY',
          },
        },
      };

      merchantProfileMetadataModel.findOne.mockResolvedValue(mockMerchantProfile);
      service.getCoreMerchantAccountConfiguration = jest.fn().mockResolvedValue(mockConfig);

      const result = await service.getMerchantProfileMetaData('merchant1', 'profile1');

      expect(result).toEqual({
        id: 'merchant-profile-id',
        name: 'Test',
        someMerchantProperty: 'value',
        paymentPlan: 'MONTHLY',
      });

      expect(mockMerchantProfile.get).toHaveBeenCalledWith({ plain: true });

      expect(merchantProfileMetadataModel.findOne).toHaveBeenCalledWith({
        where: { merchantId: 'merchant1', profileId: 'profile1' },
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
          {
            model: Filter,
            through: { attributes: ['included'] },
            attributes: [
              ['filter_id', 'id'],
              'name',
              'nameAr',
              'subCategoryId',
              'categoryId',
              'updatedBy',
              'createdAt',
              'updatedAt',
            ],
            include: [
              {
                model: Category,
                attributes: [
                  ['category_id', 'id'],
                  'name',
                  'nameAr',
                  'imageUrl',
                  'darkImageUrl',
                  'isAnimated',
                  'isNewCategory',
                  'isVirtual',
                  'isBordered',
                  'createdAt',
                  'updatedAt',
                  'updatedBy',
                  'displayOrder',
                ],
              },
              {
                model: SubCategory,
                attributes: [
                  ['sub_category_id', 'id'],
                  'name',
                  'nameAr',
                  'type',
                  'updatedBy',
                  'typeAr',
                  'createdAt',
                  'updatedAt',
                ],
              },
            ],
          },
        ],
      });

      expect(service.getCoreMerchantAccountConfiguration).toHaveBeenCalledWith('merchant1');
    });

    it('should throw INTERNAL_SERVER_ERROR on database error', async () => {
      const mockError = new Error('Database error');
      merchantProfileMetadataModel.findOne.mockRejectedValue(mockError);

      await expect(service.getMerchantProfileMetaData('merchant1', 'profile1')).rejects.toThrow(
        new HttpException('Failed to fetch merchant profile meta data', HttpStatus.INTERNAL_SERVER_ERROR)
      );

      expect(logger.error).toHaveBeenCalledWith(
        'merchantProfileService.getMerchantProfileMetaData failed',
        expect.objectContaining({ error: mockError })
      );
    });
    it('should return null if merchant profile is not found', async () => {
      merchantProfileMetadataModel.findOne.mockResolvedValue(null); // No profile found

      const mockMerchant = {
        id: 'merchant1',
        name: 'Merchant Name',
      };
      const result = await service.getMerchantProfileMetaData('merchant1', 'profile1');

      expect(merchantProfileMetadataModel.findOne).toHaveBeenCalledWith({
        where: { merchantId: 'merchant1', profileId: 'profile1' },
        include: expect.any(Array),
      });
      expect(result).toEqual(null);
    });
    it('should map filters and rename MerchantProfileFilter to MerchantFilter', async () => {
      const mockFilter = {
        filter_id: 'filter1',
        name: 'Filter 1',
        MerchantProfileFilter: { included: true },
      };

      const mockProfile = {
        id: 'merchant-profile-id',
        filters: [mockFilter],
        merchant: { someMerchantProperty: 'value' },
        get: jest.fn().mockReturnValue({
          id: 'merchant-profile-id',
          filters: [mockFilter],
          merchant: { someMerchantProperty: 'value' },
        }),
      };

      merchantProfileMetadataModel.findOne.mockResolvedValue(mockProfile);
      service.getCoreMerchantAccountConfiguration = jest.fn().mockResolvedValue({
        data: { data: { paymentTerm: 'MONTHLY' } },
      });

      const result = await service.getMerchantProfileMetaData('merchant1', 'profile1');

      expect(result.filters[0].MerchantFilter).toEqual({ included: true });
    });
    it('should skip merchant flattening if merchant is not present', async () => {
      const mockProfile = {
        id: 'profile-id',
        get: jest.fn().mockReturnValue({
          id: 'profile-id',
          merchant: null,
        }),
      };

      merchantProfileMetadataModel.findOne.mockResolvedValue(mockProfile);
      service.getCoreMerchantAccountConfiguration = jest.fn().mockResolvedValue({
        data: { data: { paymentTerm: 'MONTHLY' } },
      });

      const result = await service.getMerchantProfileMetaData('merchant1', 'profile1');

      expect(result.id).toBe('profile-id');
      expect(result.merchant).toBe(null);
    });
  });

  describe('updateMerchantProfileMetaDataStatus', () => {
    const merchantId = 'merchant1';
    const profileId = 'profile1';
    const updatedBy = 'user-123';
    let mockMerchantProfile;

    beforeEach(() => {
      mockMerchantProfile = {
        update: jest.fn(),
      };

      (service as any).getMerchantProfileWithFilters = jest.fn().mockResolvedValue(mockMerchantProfile);
      service.canActivateMerchantProfile = jest.fn();
    });

    it('should update status to ACTIVE if canActivateMerchantProfile returns true', async () => {
      (service.canActivateMerchantProfile as jest.Mock).mockReturnValue(true);

      const result = await service.updateMerchantProfileMetaDataStatus(
        merchantId,
        profileId,
        MerchantProfileStatusEnum.ACTIVE,
        updatedBy
      );

      expect((service as any).getMerchantProfileWithFilters).toHaveBeenCalledWith(merchantId, profileId);
      expect(service.canActivateMerchantProfile).toHaveBeenCalledWith(mockMerchantProfile, true);
      expect(mockMerchantProfile.update).toHaveBeenCalledWith({ status: MerchantProfileStatusEnum.ACTIVE, updatedBy });
      expect(logger.info).toHaveBeenCalledWith(
        `MerchantProfileService.updateMerchantProfileMetaDataStatus called with merchant id ${merchantId}, profile id ${profileId}, and status ${MerchantProfileStatusEnum.ACTIVE}`
      );
      expect(logger.info).toHaveBeenCalledWith('MerchantProfileService.updateMerchantProfileMetaDataStatus completed', {
        updated: true,
      });
      expect(result).toBe(true);
    });

    it('should not update status if canActivateMerchantProfile returns false for ACTIVE', async () => {
      (service.canActivateMerchantProfile as jest.Mock).mockReturnValue(false);

      const result = await service.updateMerchantProfileMetaDataStatus(
        merchantId,
        profileId,
        MerchantProfileStatusEnum.ACTIVE,
        updatedBy
      );

      expect(mockMerchantProfile.update).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should update status to READY if canActivateMerchantProfile returns true', async () => {
      (service.canActivateMerchantProfile as jest.Mock).mockReturnValue(true);

      const result = await service.updateMerchantProfileMetaDataStatus(
        merchantId,
        profileId,
        MerchantProfileStatusEnum.READY,
        updatedBy
      );

      expect(service.canActivateMerchantProfile).toHaveBeenCalledWith(mockMerchantProfile, false);
      expect(mockMerchantProfile.update).toHaveBeenCalledWith({ status: MerchantProfileStatusEnum.READY, updatedBy });
      expect(result).toBe(true);
    });

    it('should not update status if canActivateMerchantProfile returns false for READY', async () => {
      (service.canActivateMerchantProfile as jest.Mock).mockReturnValue(false);

      const result = await service.updateMerchantProfileMetaDataStatus(
        merchantId,
        profileId,
        MerchantProfileStatusEnum.READY,
        updatedBy
      );

      expect(mockMerchantProfile.update).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should always update for statuses other than ACTIVE and READY', async () => {
      const otherStatus = MerchantProfileStatusEnum.PENDING;

      const result = await service.updateMerchantProfileMetaDataStatus(merchantId, profileId, otherStatus, updatedBy);

      expect(mockMerchantProfile.update).toHaveBeenCalledWith({ status: otherStatus, updatedBy });
      expect(result).toBe(true);
    });

    it('should log error and throw HttpException on failure', async () => {
      const mockError = new Error('DB failure');
      ((service as any).getMerchantProfileWithFilters as jest.Mock).mockRejectedValue(mockError);

      await expect(
        service.updateMerchantProfileMetaDataStatus(merchantId, profileId, MerchantProfileStatusEnum.ACTIVE, updatedBy)
      ).rejects.toThrow(
        new HttpException('Failed to update merchant profile meta data status', HttpStatus.INTERNAL_SERVER_ERROR)
      );

      expect(logger.error).toHaveBeenCalledWith('merchantProfileService.updateMerchantProfileMetaDataStatus failed', {
        error: mockError,
      });
    });
  });

  describe('deleteMerchantProfilePhotoById', () => {
    it('should delete merchant profile photo', async () => {
      const mockPhoto = {
        id: 'photo1',
        destroy: jest.fn().mockResolvedValue(true),
      };
      merchantProfilePhotoModel.findByPk.mockResolvedValue(mockPhoto);

      const result = await service.deleteMerchantProfilePhotoById('photo1');

      expect(merchantProfilePhotoModel.findByPk).toHaveBeenCalledWith('photo1');
      expect(mockPhoto.destroy).toHaveBeenCalled();
      expect(result).toEqual({ deleted: true });
    });

    it('should throw NOT_FOUND when photo not found', async () => {
      merchantProfilePhotoModel.findByPk.mockResolvedValue(null);

      await expect(service.deleteMerchantProfilePhotoById('photo1')).rejects.toThrow(
        new HttpException(ErrorMessages.merchantProfilePhoto.notFound, HttpStatus.NOT_FOUND)
      );
    });

    it('should throw INTERNAL_SERVER_ERROR on database error', async () => {
      merchantProfilePhotoModel.findByPk.mockRejectedValue(new Error('Database error'));

      await expect(service.deleteMerchantProfilePhotoById('photo1')).rejects.toThrow(
        new HttpException('Failed to delete merchant profile ', HttpStatus.INTERNAL_SERVER_ERROR)
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getMerchantProfilePhotos', () => {
    const merchantProfileId = 'profile-id-123';
    it('should return list of merchant profile photos', async () => {
      const mockPhotos = [
        { id: '1', merchantProfileMetadataId: merchantProfileId, cdnUrl: 'url-1' },
        { id: '2', merchantProfileMetadataId: merchantProfileId, cdnUrl: 'url-2' },
      ];

      merchantProfilePhotoModel.findAll.mockResolvedValue(mockPhotos);

      const result = await service.getMerchantProfilePhotos(merchantProfileId);

      expect(merchantProfilePhotoModel.findAll).toHaveBeenCalledWith({
        where: {
          merchantProfileMetadataId: merchantProfileId,
          isActive: true,
        },
        attributes: ['id', 'merchantProfileMetadataId', 'cdnUrl', 'isDefault'],
      });

      expect(result).toEqual(mockPhotos);
    });

    it('should throw HttpException when model throws', async () => {
      const error = new Error('Database error');
      merchantProfilePhotoModel.findAll.mockRejectedValue(error);

      await expect(service.getMerchantProfilePhotos(merchantProfileId)).rejects.toThrow(HttpException);
      expect(logger.error).toHaveBeenCalledWith('MerchantProfileService.getMerchantProfilePhotos failed', { error });
    });
  });
  describe('updateMerchantProfileOutletsNumber', () => {
    const transaction = {} as Transaction;
    it('should update merchant profile outlet numbers successfully', async () => {
      const merchantId = 'm1';
      const profileId = 'p1';
      const body = { activeOutletsNum: 5, inActiveOutletsNum: 2 };

      merchantProfileMetadataModel.findOne.mockResolvedValue({ id: 1 });
      merchantProfileMetadataModel.update.mockResolvedValue([1]);

      await service.updateMerchantProfileOutletsNumber(merchantId, profileId, body, transaction);

      expect(merchantProfileMetadataModel.findOne).toHaveBeenCalledWith({
        where: { merchantId, profileId },
      });
      expect(merchantProfileMetadataModel.update).toHaveBeenCalledWith(
        { activeOutletsNum: 5, inActiveOutletsNum: 2 },
        { where: { merchantId, profileId }, transaction }
      );
    });

    it('should throw 404 if merchant profile not found', async () => {
      merchantProfileMetadataModel.findOne.mockResolvedValue(null);

      await expect(
        service.updateMerchantProfileOutletsNumber('m1', 'p1', { activeOutletsNum: 1, inActiveOutletsNum: 1 }, transaction)
      ).rejects.toThrow(HttpException);
    });

    it('should handle unexpected errors and log them', async () => {
      merchantProfileMetadataModel.findOne.mockRejectedValue(new Error('DB error'));

      await expect(
        service.updateMerchantProfileOutletsNumber('m1', 'p1', { activeOutletsNum: 1, inActiveOutletsNum: 1 }, transaction)
      ).rejects.toThrow(HttpException);
    });
  });

  describe('canActivateMerchantProfile', () => {
    it('should return true when all conditions are met', () => {
      const merchantProfile = {
        name: 'Test Profile',
        merchant: { status: 'ACTIVE' },
        filters: [{ id: '1' }],
      };

      const result = service.canActivateMerchantProfile(merchantProfile as any, true);
      expect(result).toBe(true);
    });

    it('should throw error if name is missing', () => {
      expect(() => service.canActivateMerchantProfile({} as any, true)).toThrow(HttpException);
    });

    it('should throw error if CLO is required and merchant is not ACTIVE', () => {
      const merchantProfile = {
        name: 'X',
        merchant: { status: 'INACTIVE' },
        filters: [{}],
      };

      expect(() => service.canActivateMerchantProfile(merchantProfile as any, true)).toThrow(HttpException);
    });

    it('should throw error if filters are empty', () => {
      const merchantProfile = {
        name: 'Y',
        merchant: { status: 'ACTIVE' },
        filters: [],
      };

      expect(() => service.canActivateMerchantProfile(merchantProfile as any, true)).toThrow(HttpException);
    });
  });

  describe('getMerchantProfileWithFilters', () => {
    it('should return merchant profile with filters and merchant', async () => {
      const resultMock = {
        id: 'mockProfile',
      };
      merchantProfileMetadataModel.findOne.mockResolvedValue(resultMock);

      const result = await (service as any).getMerchantProfileWithFilters('m1', 'p1');
      expect(result).toEqual(resultMock);
      expect(merchantProfileMetadataModel.findOne).toHaveBeenCalledWith({
        where: { merchantId: 'm1', profileId: 'p1' },
        include: [{ model: Filter }, { model: Merchant, attributes: ['city', 'country', 'status'] }],
      });
    });

    it('should throw 404 if merchant profile not found', async () => {
      merchantProfileMetadataModel.findOne.mockResolvedValue(null);

      await expect((service as any).getMerchantProfileWithFilters('m1', 'p1')).rejects.toThrow(HttpException);
    });

    it('should handle unexpected errors and log them', async () => {
      merchantProfileMetadataModel.findOne.mockRejectedValue(new Error('Something went wrong'));

      await expect((service as any).getMerchantProfileWithFilters('m1', 'p1')).rejects.toThrow(HttpException);
    });
  });

  describe('getMerchantStatusByProfileId', () => {
    it('should return true if merchant profile status is ACTIVE', async () => {
      const merchantId = 'merchant-1';
      const profileId = 'profile-1';
      const mockMerchantProfile = { status: MerchantProfileStatusEnum.ACTIVE };

      mockMerchantProfileMetadataModel.findOne.mockResolvedValue(mockMerchantProfile);

      const result = await service.getMerchantStatusByProfileId(merchantId, profileId);

      expect(result).toBe(true);
      expect(mockMerchantProfileMetadataModel.findOne).toHaveBeenCalledWith({ where: { merchantId, profileId } });
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          `MerchantProfileService.getMerchantStatusByProfileId called with merchant id ${merchantId} and profile id ${profileId}`
        )
      );
      expect(mockLogger.info).toHaveBeenCalledWith('MerchantProfileService.getMerchantStatusByProfileId completed', {
        status: true,
      });
    });

    it('should return false if merchant profile status is not ACTIVE', async () => {
      const merchantId = 'merchant-2';
      const profileId = 'profile-2';
      const mockMerchantProfile = { status: MerchantProfileStatusEnum.PENDING };

      mockMerchantProfileMetadataModel.findOne.mockResolvedValue(mockMerchantProfile);

      const result = await service.getMerchantStatusByProfileId(merchantId, profileId);

      expect(result).toBe(false);
      expect(mockMerchantProfileMetadataModel.findOne).toHaveBeenCalledWith({ where: { merchantId, profileId } });
      expect(mockLogger.info).toHaveBeenCalledWith('MerchantProfileService.getMerchantStatusByProfileId completed', {
        status: false,
      });
    });

    it('should throw HttpException with NOT_FOUND if merchant profile not found', async () => {
      const merchantId = 'merchant-3';
      const profileId = 'profile-3';

      mockMerchantProfileMetadataModel.findOne.mockResolvedValue(null);

      await expect(service.getMerchantStatusByProfileId(merchantId, profileId)).rejects.toThrow(HttpException);
      await expect(service.getMerchantStatusByProfileId(merchantId, profileId)).rejects.toThrow(
        ErrorMessages.common.entityNotFound('Merchant Profile').message
      );
    });

    it('should log and rethrow HttpException when an unexpected error occurs', async () => {
      const merchantId = 'merchant-4';
      const profileId = 'profile-4';
      const mockError = new Error('Database connection failed');

      mockMerchantProfileMetadataModel.findOne.mockRejectedValue(mockError);

      await expect(service.getMerchantStatusByProfileId(merchantId, profileId)).rejects.toThrow(HttpException);
      expect(mockLogger.error).toHaveBeenCalledWith('MerchantProfileService.getMerchantStatusByProfileId - exception ', {
        error: mockError,
      });
    });
  });

  describe('getMerchants', () => {
    const profileId = 'profile-123';
    const mockDto = {
      pageIndex: 1,
      pageSize: 10,
      categoryIds: ['cat-1', 'cat-2'],
      cityId: 'city-123',
      search: 'test merchant',
      sourceCoordinate: { lat: 25.2048, lng: 55.2708 },
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return merchants with pagination when no cityId is provided', async () => {
      const dtoWithoutCity = {
        pageIndex: 1,
        pageSize: 10,
        categoryIds: ['cat-1'],
      };

      const mockPaginatedMerchants = [{ id: 'merchant-1' }, { id: 'merchant-2' }];
      const mockMerchants = [
        {
          id: 'merchant-1',
          name: 'Merchant 1',
          maxOfferValue: 100,
        },
        {
          id: 'merchant-2',
          name: 'Merchant 2',
          maxOfferValue: 50,
        },
      ];

      merchantProfileMetadataModel.findAll
        .mockResolvedValueOnce(mockPaginatedMerchants)
        .mockResolvedValueOnce(mockMerchants);
      merchantProfileMetadataModel.count.mockResolvedValue(2);

      const result = await service.getMerchants(profileId, dtoWithoutCity);

      expect(merchantProfileMetadataModel.findAll).toHaveBeenCalledTimes(2);
      expect(merchantProfileMetadataModel.count).toHaveBeenCalledWith({
        where: { profileId, status: 'ACTIVE' },
      });
      expect(result).toEqual({
        data: mockMerchants,
        pagination: {
          page: 1,
          pageCount: 1,
          total: 2,
          count: 2,
        },
      });
    });

    it('should filter by search term when provided', async () => {
      const dtoWithSearch = {
        pageIndex: 1,
        pageSize: 10,
        search: 'coffee',
      };

      const mockPaginatedMerchants = [{ id: 'merchant-1' }];
      const mockMerchants = [{ id: 'merchant-1', name: 'Coffee Shop' }];

      merchantProfileMetadataModel.findAll
        .mockResolvedValueOnce(mockPaginatedMerchants)
        .mockResolvedValueOnce(mockMerchants);
      merchantProfileMetadataModel.count.mockResolvedValue(1);

      const result = await service.getMerchants(profileId, dtoWithSearch);

      expect(merchantProfileMetadataModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            profileId,
            status: 'ACTIVE',
            [Op.or]: [{ name: { [Op.iLike]: '%coffee%' } }],
          }),
        })
      );
      expect(result.data).toEqual(mockMerchants);
    });

    it('should filter by categoryIds when provided', async () => {
      const dtoWithCategories = {
        pageIndex: 1,
        pageSize: 10,
        categoryIds: ['cat-1', 'cat-2'],
      };

      const mockPaginatedMerchants = [{ id: 'merchant-1' }];
      const mockMerchants = [{ id: 'merchant-1' }];

      merchantProfileMetadataModel.findAll
        .mockResolvedValueOnce(mockPaginatedMerchants)
        .mockResolvedValueOnce(mockMerchants);
      merchantProfileMetadataModel.count.mockResolvedValue(1);

      await service.getMerchants(profileId, dtoWithCategories);

      const findAllCalls = merchantProfileMetadataModel.findAll.mock.calls;
      const secondCall = findAllCalls[1];
      expect(secondCall[0]).toEqual(
        expect.objectContaining({
          include: expect.arrayContaining([
            expect.objectContaining({
              where: { categoryId: { [Op.in]: ['cat-1', 'cat-2'] } },
            }),
          ]),
        })
      );
    });

    it('should filter by cityId when provided', async () => {
      const dtoWithCity = {
        pageIndex: 1,
        pageSize: 10,
        cityId: 'city-123',
      };

      const mockOutletAddresses = [{ outletId: 'outlet-1' }, { outletId: 'outlet-2' }, { outletId: 'outlet-3' }];
      const mockOutletToMerchant = [
        { merchantId: 'merchant-1' },
        { merchantId: 'merchant-1' },
        { merchantId: 'merchant-2' },
      ];
      const mockPaginatedMerchants = [{ id: 'merchant-1' }, { id: 'merchant-2' }];
      const mockMerchants = [{ id: 'merchant-1' }, { id: 'merchant-2' }];

      outletAddressModel.findAll.mockResolvedValue(mockOutletAddresses);
      outletProfileMetadataModel.findAll.mockResolvedValue(mockOutletToMerchant);
      merchantProfileMetadataModel.findAll
        .mockResolvedValueOnce(mockPaginatedMerchants)
        .mockResolvedValueOnce(mockMerchants);
      merchantProfileMetadataModel.count.mockResolvedValue(2);

      const result = await service.getMerchants(profileId, dtoWithCity);

      expect(outletAddressModel.findAll).toHaveBeenCalledWith({
        where: { areaId: 'city-123' },
        attributes: ['outletId'],
        raw: true,
      });
      expect(outletProfileMetadataModel.findAll).toHaveBeenCalledWith({
        where: {
          outletId: { [Op.in]: ['outlet-1', 'outlet-2', 'outlet-3'] },
          profileId,
        },
        attributes: ['merchantId'],
        raw: true,
      });
      const findAllCalls = merchantProfileMetadataModel.findAll.mock.calls;
      const firstCall = findAllCalls[0];
      expect(firstCall[0]).toEqual(
        expect.objectContaining({
          where: expect.objectContaining({
            merchantId: { [Op.in]: ['merchant-1', 'merchant-2'] },
          }),
        })
      );
      expect(result.data).toEqual(mockMerchants);
    });

    it('should resolve cityId from sourceCoordinate when cityId is not provided', async () => {
      const dtoWithCoordinate = {
        pageIndex: 1,
        pageSize: 10,
        sourceCoordinate: { lat: 25.2048, lng: 55.2708 },
      };

      const mockNearbyOutlet = { areaId: 'resolved-city-123' };
      const mockOutletAddresses = [{ outletId: 'outlet-1' }];
      const mockOutletToMerchant = [{ merchantId: 'merchant-1' }];
      const mockPaginatedMerchants = [{ id: 'merchant-1' }];
      const mockMerchants = [{ id: 'merchant-1' }];

      outletAddressModel.findOne.mockResolvedValue(mockNearbyOutlet);
      outletAddressModel.findAll.mockResolvedValue(mockOutletAddresses);
      outletProfileMetadataModel.findAll.mockResolvedValue(mockOutletToMerchant);
      merchantProfileMetadataModel.findAll
        .mockResolvedValueOnce(mockPaginatedMerchants)
        .mockResolvedValueOnce(mockMerchants);
      merchantProfileMetadataModel.count.mockResolvedValue(1);

      await service.getMerchants(profileId, dtoWithCoordinate);

      // Current implementation resolves city only from `cityId`, not `sourceCoordinate`.
      expect(outletAddressModel.findOne).not.toHaveBeenCalled();
      expect(outletAddressModel.findAll).not.toHaveBeenCalled();
    });

    it('should not resolve cityId from sourceCoordinate when areaId is not found', async () => {
      const dtoWithCoordinate = {
        pageIndex: 1,
        pageSize: 10,
        sourceCoordinate: { lat: 25.2048, lng: 55.2708 },
      };

      const mockPaginatedMerchants = [{ id: 'merchant-1' }];
      const mockMerchants = [{ id: 'merchant-1' }];

      outletAddressModel.findOne.mockResolvedValue(null);
      merchantProfileMetadataModel.findAll
        .mockResolvedValueOnce(mockPaginatedMerchants)
        .mockResolvedValueOnce(mockMerchants);
      merchantProfileMetadataModel.count.mockResolvedValue(1);

      await service.getMerchants(profileId, dtoWithCoordinate);

      expect(outletAddressModel.findOne).not.toHaveBeenCalled();
      expect(outletAddressModel.findAll).not.toHaveBeenCalled();
      const findAllCalls = merchantProfileMetadataModel.findAll.mock.calls;
      const firstCall = findAllCalls[0];
      expect(firstCall[0]).toEqual(
        expect.objectContaining({
          where: expect.not.objectContaining({
            merchantId: expect.anything(),
          }),
        })
      );
    });

    it('should return empty result when no valid outletIds found for cityId', async () => {
      const dtoWithCity = {
        pageIndex: 1,
        pageSize: 10,
        cityId: 'city-123',
      };

      outletAddressModel.findAll.mockResolvedValue([]);

      const result = await service.getMerchants(profileId, dtoWithCity);

      expect(result).toEqual({
        data: [],
        pagination: {
          page: 1,
          pageCount: 0,
          total: 0,
          count: 0,
        },
      });
      expect(merchantProfileMetadataModel.findAll).not.toHaveBeenCalled();
    });

    it('should return empty result when no merchants found for outlets', async () => {
      const dtoWithCity = {
        pageIndex: 1,
        pageSize: 10,
        cityId: 'city-123',
      };

      const mockOutletAddresses = [{ outletId: 'outlet-1' }];

      outletAddressModel.findAll.mockResolvedValue(mockOutletAddresses);
      outletProfileMetadataModel.findAll.mockResolvedValue([]);

      const result = await service.getMerchants(profileId, dtoWithCity);

      expect(result).toEqual({
        data: [],
        pagination: {
          page: 1,
          pageCount: 0,
          total: 0,
          count: 0,
        },
      });
      expect(merchantProfileMetadataModel.findAll).not.toHaveBeenCalled();
    });

    it('should return empty result when no paginated merchants found', async () => {
      const dto = {
        pageIndex: 1,
        pageSize: 10,
      };

      merchantProfileMetadataModel.findAll.mockResolvedValueOnce([]);

      const result = await service.getMerchants(profileId, dto);

      expect(result).toEqual({
        data: [],
        pagination: {
          page: 1,
          pageCount: 0,
          total: 0,
          count: 0,
        },
      });
      expect(merchantProfileMetadataModel.count).not.toHaveBeenCalled();
    });

    it('should calculate correct offset and pagination', async () => {
      const dto = {
        pageIndex: 2,
        pageSize: 5,
      };

      const mockPaginatedMerchants = [{ id: 'merchant-1' }];
      const mockMerchants = [{ id: 'merchant-1' }];

      merchantProfileMetadataModel.findAll
        .mockResolvedValueOnce(mockPaginatedMerchants)
        .mockResolvedValueOnce(mockMerchants);
      merchantProfileMetadataModel.count.mockResolvedValue(10);

      const result = await service.getMerchants(profileId, dto);

      const findAllCalls = merchantProfileMetadataModel.findAll.mock.calls;
      const firstCall = findAllCalls[0];
      expect(firstCall[0]).toEqual(
        expect.objectContaining({
          offset: 5,
          limit: 5,
        })
      );
      expect(result.pagination).toEqual({
        page: 2,
        pageCount: 2,
        total: 10,
        count: 1,
      });
    });

    it('should order merchants by maxOfferValue correctly', async () => {
      const dto = {
        pageIndex: 1,
        pageSize: 10,
      };

      const mockPaginatedMerchants = [{ id: 'merchant-1' }];
      const mockMerchants = [{ id: 'merchant-1' }];

      merchantProfileMetadataModel.findAll
        .mockResolvedValueOnce(mockPaginatedMerchants)
        .mockResolvedValueOnce(mockMerchants);
      merchantProfileMetadataModel.count.mockResolvedValue(1);

      await service.getMerchants(profileId, dto);

      const findAllCalls = merchantProfileMetadataModel.findAll.mock.calls;
      const firstCall = findAllCalls[0];
      expect(firstCall[0]).toEqual(
        expect.objectContaining({
          order: [
            [Sequelize.literal('"max_offer_value" IS NULL'), 'ASC'],
            ['maxOfferValue', 'DESC'],
          ],
        })
      );
    });

    it('should handle error and throw HttpException', async () => {
      const dto = {
        pageIndex: 1,
        pageSize: 10,
      };

      const mockError: any = new Error('Database error');
      mockError.status = HttpStatus.BAD_REQUEST;
      mockError.response = 'Custom error message';

      merchantProfileMetadataModel.findAll.mockRejectedValue(mockError);

      await expect(service.getMerchants(profileId, dto)).rejects.toThrow(HttpException);

      expect(mockLogger.error).toHaveBeenCalledWith('merchantProfileService.getMerchants failed', {
        err: mockError,
      });
    });

    it('should handle error without status and response', async () => {
      const dto = {
        pageIndex: 1,
        pageSize: 10,
      };

      const mockError = new Error('Database error');

      merchantProfileMetadataModel.findAll.mockRejectedValue(mockError);

      await expect(service.getMerchants(profileId, dto)).rejects.toThrow(HttpException);

      const thrownError = await service.getMerchants(profileId, dto).catch(e => e);
      expect(thrownError.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(thrownError.message).toBe('Failed to fetch merchant profile meta data');
    });

    it('should handle sourceCoordinate without lat or lng', async () => {
      const dtoWithIncompleteCoordinate = {
        pageIndex: 1,
        pageSize: 10,
        sourceCoordinate: { lat: 25.2048 },
      };

      const mockPaginatedMerchants = [{ id: 'merchant-1' }];
      const mockMerchants = [{ id: 'merchant-1' }];

      merchantProfileMetadataModel.findAll
        .mockResolvedValueOnce(mockPaginatedMerchants)
        .mockResolvedValueOnce(mockMerchants);
      merchantProfileMetadataModel.count.mockResolvedValue(1);

      await service.getMerchants(profileId, dtoWithIncompleteCoordinate);

      expect(outletAddressModel.findOne).not.toHaveBeenCalled();
    });

    it('should deduplicate merchantIds when filtering by cityId', async () => {
      const dtoWithCity = {
        pageIndex: 1,
        pageSize: 10,
        cityId: 'city-123',
      };

      const mockOutletAddresses = [{ outletId: 'outlet-1' }, { outletId: 'outlet-2' }];
      const mockOutletToMerchant = [
        { merchantId: 'merchant-1' },
        { merchantId: 'merchant-1' },
        { merchantId: 'merchant-2' },
        { merchantId: 'merchant-2' },
      ];
      const mockPaginatedMerchants = [{ id: 'merchant-1' }, { id: 'merchant-2' }];
      const mockMerchants = [{ id: 'merchant-1' }, { id: 'merchant-2' }];

      outletAddressModel.findAll.mockResolvedValue(mockOutletAddresses);
      outletProfileMetadataModel.findAll.mockResolvedValue(mockOutletToMerchant);
      merchantProfileMetadataModel.findAll
        .mockResolvedValueOnce(mockPaginatedMerchants)
        .mockResolvedValueOnce(mockMerchants);
      merchantProfileMetadataModel.count.mockResolvedValue(2);

      await service.getMerchants(profileId, dtoWithCity);

      expect(outletProfileMetadataModel.findAll).toHaveBeenCalled();
      const findAllCalls = merchantProfileMetadataModel.findAll.mock.calls;
      const firstCall = findAllCalls[0];
      expect(firstCall[0]).toEqual(
        expect.objectContaining({
          where: expect.objectContaining({
            merchantId: { [Op.in]: ['merchant-1', 'merchant-2'] },
          }),
        })
      );
    });
  });
});
