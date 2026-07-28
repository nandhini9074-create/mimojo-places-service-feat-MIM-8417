import { HttpException } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/sequelize';
import { TestingModule, Test } from '@nestjs/testing';
import { OutletProfileMapping } from 'src/outlet/models/outlet-profile-mapping.model';
import { Profile } from 'src/outlet/models/profile.model';
import { OutletProfileMappingService } from '../outlet-profile-mapping.service';
import { CreateOutletProfileDto } from 'src/outlet/dtos/create-outlet-profile-dto';
import { UpdateOutletProfileDto } from 'src/outlet/dtos/update-outlet-profile-dto';
import { MerchantOutletProfilesDto } from 'src/outlet/dtos/merchant-outlet-profile-dto';
import { OutletProfileService } from 'src/outlet-profile/services/outlet-profile.service';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';
import { SearchServiceProxy } from 'src/outlet/proxies/search-service.proxy';
import { OutletService } from '../outlet.service';
import { Op } from 'sequelize';
import { OutletOfferProxy } from 'src/outlet/proxies/outlet-offer.proxy';
import { OutletProfileStatusEnum } from 'src/outlet-profile/enums/outlet-profile-enum';
import { SchemeServiceProxy } from 'src/outlet/proxies/scheme-service.proxy';
import { RewardEngineWrapperProxy } from 'src/outlet/proxies/reward-engine-wrapper.proxy';
import { ConfigService } from '@nestjs/config';

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
};

const mockProfileModel = {
  findAll: jest.fn(),
  sequelize: {
    fn: jest.fn(() => 'COUNT_FUNCTION'),
    col: jest.fn(() => 'outletProfileMapping.id'),
  },
};

const mockOutletProfileMappingModel = {
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  bulkCreate: jest.fn(),
  findOrCreate: jest.fn(),
};
const mockOutletProfileService = {
  insertOutletProfileMetadata: jest.fn(),
  updateStatusForProfile: jest.fn(),
  validateAndUpdateOutletProfileStatus: jest.fn(),
  cloneOutletProfileMetadata: jest.fn(),
};

const mockSearchServiceProxy = {
  updateOutletStatus: jest.fn(),
};

const mockOutletService = {
  validateAndUpdateOutletStatus: jest.fn(),
};

const mockOutletOfferProxy = {
  getOutletCurrentOfferForProfile: jest.fn(),
};
const mockSchemeServiceProxy = {
  getVisaB2bMerchantOnboardingAvailability: jest.fn(),
};

const mockRewardEngineWrapperProxy = {
  UpdateOutletMaxOfferForProfile: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue({ IS_REWARD_ENGINE_ENABLED: false }),
};
describe('OutletProfileMappingService', () => {
  let service: OutletProfileMappingService;
  let mockTransaction: any;
  let mockSequelize: any;
  beforeEach(async () => {
    mockTransaction = {};
    mockSequelize = {
      transaction: jest.fn().mockImplementation(async cb => {
        return cb(mockTransaction);
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutletProfileMappingService,
        { provide: getModelToken(Profile), useValue: mockProfileModel },
        { provide: getModelToken(OutletProfileMapping), useValue: mockOutletProfileMappingModel },
        // { provide: getModelToken(OutletProfileMetadata), useValue: mockOutletProfileMetadataModel },
        {
          provide: getConnectionToken('default'),
          useValue: mockSequelize,
        },
        {
          provide: OutletProfileService,
          useValue: mockOutletProfileService,
        },
        { provide: CustomPinoLogger, useValue: mockLogger },
        { provide: SearchServiceProxy, useValue: mockSearchServiceProxy },
        { provide: OutletService, useValue: mockOutletService },
        { provide: OutletOfferProxy, useValue: mockOutletOfferProxy },
        { provide: SchemeServiceProxy, useValue: mockSchemeServiceProxy },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RewardEngineWrapperProxy, useValue: mockRewardEngineWrapperProxy },
      ],
    }).compile();

    service = module.get<OutletProfileMappingService>(OutletProfileMappingService);
  });

  it('should create outlet profile mapping', async () => {
    const dto: CreateOutletProfileDto = {
      outletId: '1',
      profileId: '1',
      startDate: undefined,
      endDate: undefined,
      isActive: false,
      updatedBy: '',
    };
    mockOutletProfileMappingModel.create.mockResolvedValue(dto);
    const result = await service.create(dto);
    expect(result).toEqual(dto);
  });

  it('should throw exception on unique constraint error', async () => {
    const dto: CreateOutletProfileDto = {
      outletId: '1',
      profileId: '1',
      startDate: undefined,
      endDate: undefined,
      isActive: false,
      updatedBy: '',
    };
    mockOutletProfileMappingModel.create.mockRejectedValue({
      name: 'SequelizeUniqueConstraintError',
    });
    await expect(service.create(dto)).rejects.toThrow(HttpException);
  });

  it('should clone mapping from existing outlet', async () => {
    mockOutletProfileMappingModel.findOne.mockResolvedValue({
      outletId: 'existing-outlet',
      profileId: 'p1',
      isActive: true,
    });
    mockOutletProfileMappingModel.create.mockResolvedValue({ id: 'new-map' });

    const result = await service.clone({
      existingOutletId: 'existing-outlet',
      outletId: 'new-outlet',
      profileId: 'p1',
      updatedBy: 'u1',
    } as any);

    expect(mockOutletProfileMappingModel.findOne).toHaveBeenCalled();
    expect(mockOutletProfileMappingModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ outletId: 'new-outlet', updatedBy: 'u1' }),
      { transaction: undefined }
    );
    expect(result).toEqual({ id: 'new-map' });
  });

  it('should throw mapping creation failed when clone fails with non-unique error', async () => {
    mockOutletProfileMappingModel.findOne.mockRejectedValue(new Error('clone-fail'));
    await expect(
      service.clone({ existingOutletId: 'e1', outletId: 'o1', profileId: 'p1', updatedBy: 'u1' } as any)
    ).rejects.toThrow(HttpException);
  });

  it('should update outlet profile mapping', async () => {
    const dto: UpdateOutletProfileDto = {
      outletId: '1',
      profileId: '1',
      startDate: undefined,
      endDate: undefined,
      isActive: false,
      updatedBy: '',
    };
    mockOutletProfileMappingModel.update.mockResolvedValue([1, [dto]]);
    const result = await service.updateByOutletIdProfileId(dto);
    expect(result).toEqual([1, [dto]]);
  });

  it('should delete outlet profile mapping', async () => {
    mockOutletProfileMappingModel.destroy.mockResolvedValue(1);
    const result = await service.deleteByOutletIdProfileId('1', '2');
    expect(result).toBe(1);
  });

  it('should find all mappings', async () => {
    const data = [{ id: 1 }];
    mockOutletProfileMappingModel.findAll.mockResolvedValue(data);
    const result = await service.findAll();
    expect(result).toEqual(data);
  });

  it('should find one mapping', async () => {
    const data = { id: 1 };
    mockOutletProfileMappingModel.findOne.mockResolvedValue(data);
    const result = await service.findOne('1', '2');
    expect(result).toEqual(data);
  });

  it('should find by outlet ID', async () => {
    const data = [{ id: 1 }];
    mockOutletProfileMappingModel.findAll.mockResolvedValue(data);
    const result = await service.findByOutletId('1');
    expect(result).toEqual(data);
  });

  it('should find all outlets by transaction date', async () => {
    const data = [{ id: 1 }];
    mockOutletProfileMappingModel.findAll.mockResolvedValue(data);
    const result = await service.findAllOutletsByTransactionDate('1', new Date());
    expect(result).toEqual(data);
  });

  it('should find by profile ID and group by merchant', async () => {
    const data = [
      {
        outlet: { merchantId: 'm1' },
        outletId: 'o1',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      },
      {
        outlet: { merchantId: 'm1' },
        outletId: 'o2',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      },
    ];
    mockOutletProfileMappingModel.findAll.mockResolvedValue(data);
    const result = await service.findByProfileId('p1');
    expect(result[0].includedOutlets).toContain('o1');
    expect(result[0].includedOutlets).toContain('o2');
  });

  describe('saveMerchantOutletProfile', () => {
    const token = 'mock-token';
    const userId = 'user-1';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should map included and excluded merchant outlets and return mapped records', async () => {
      const dto: MerchantOutletProfilesDto = {
        profileId: 'p1',
        merchantOutletProfileDtos: [
          {
            includedOutlets: ['o1', 'o2'],
            excludedOutlets: ['o3'],
            merchantId: 'm1',
            startDate: new Date('2025-12-01'),
            endDate: new Date('2025-12-31'),
          },
        ],
      };

      const mapOutletToProfileSpy = jest.spyOn(service as any, 'mapOutletToProfile').mockImplementation((payload: any) => {
        if (payload.outletId === 'o3') {
          return Promise.resolve(true);
        }
        return Promise.resolve({ outletId: payload.outletId } as any);
      });

      const result = await service.saveMerchantOutletProfile(dto, userId);

      /** mapOutletToProfile calls */
      expect(mapOutletToProfileSpy).toHaveBeenCalledTimes(3);

      /** excluded outlet */
      expect(mapOutletToProfileSpy).toHaveBeenCalledWith(
        {
          outletId: 'o3',
          profileId: 'p1',
          merchantId: 'm1',
          mapToProfile: false,
        },
        userId,
        true
      );

      /** included outlets */
      expect(mapOutletToProfileSpy).toHaveBeenCalledWith(
        {
          outletId: 'o1',
          profileId: 'p1',
          merchantId: 'm1',
          mapToProfile: true,
          startDate: dto.merchantOutletProfileDtos[0].startDate,
          endDate: dto.merchantOutletProfileDtos[0].endDate,
        },
        userId,
        true
      );

      expect(mapOutletToProfileSpy).toHaveBeenCalledWith(
        {
          outletId: 'o2',
          profileId: 'p1',
          merchantId: 'm1',
          mapToProfile: true,
          startDate: dto.merchantOutletProfileDtos[0].startDate,
          endDate: dto.merchantOutletProfileDtos[0].endDate,
        },
        userId,
        true
      );

      /** result should only contain mapped records (true is filtered out) */
      expect(result).toEqual([{ outletId: 'o1' }, { outletId: 'o2' }]);
    });

    it('should handle empty excludedOutlets gracefully', async () => {
      const dto: MerchantOutletProfilesDto = {
        profileId: 'p1',
        merchantOutletProfileDtos: [
          {
            includedOutlets: ['o1'],
            excludedOutlets: [],
            merchantId: 'm1',
            startDate: undefined,
            endDate: undefined,
          },
        ],
      };

      const mapOutletToProfileSpy = jest
        .spyOn(service as any, 'mapOutletToProfile')
        .mockResolvedValue({ outletId: 'o1' } as any);

      const result = await service.saveMerchantOutletProfile(dto, userId);

      /** should only be called for included outlets */
      expect(mapOutletToProfileSpy).toHaveBeenCalledTimes(1);

      expect(mapOutletToProfileSpy).toHaveBeenCalledWith(
        {
          outletId: 'o1',
          profileId: 'p1',
          merchantId: 'm1',
          mapToProfile: true,
          startDate: undefined,
          endDate: undefined,
        },
        userId,
        true
      );

      /** excludedOutlets empty → nothing filtered out */
      expect(result).toEqual([{ outletId: 'o1' }]);
    });

    it('should throw HttpException if saveMerchantOutletProfile fails', async () => {
      jest
        .spyOn(service as any, 'mapOutletToProfile')
        .mockRejectedValue(new HttpException('Failed to map the outlet to profile', 500));

      jest.spyOn(mockLogger, 'error').mockImplementation(() => {});

      const dto: MerchantOutletProfilesDto = {
        profileId: 'p1',
        merchantOutletProfileDtos: [
          {
            includedOutlets: ['o1'],
            excludedOutlets: [],
            merchantId: 'm1',
            startDate: new Date(),
            endDate: new Date(),
          },
        ],
      };

      await expect(service.saveMerchantOutletProfile(dto, userId)).rejects.toThrow('Outlet profile mapping creation failed');

      /** inner error logged */
      expect(mockLogger.error).toHaveBeenCalledWith(
        'OutletProfileMappingService.saveMerchantOutletProfile error',
        expect.objectContaining({
          error: expect.any(HttpException),
        })
      );
    });
  });

  it('should fetch profile mapping count and attach visa onboarding availability', async () => {
    const mockProfiles = [
      {
        id: 1,
        dataValues: {
          id: 1,
          mappingCount: 2,
        },
      },
    ];

    mockProfileModel.findAll.mockResolvedValue(mockProfiles);

    mockSchemeServiceProxy.getVisaB2bMerchantOnboardingAvailability.mockResolvedValue([
      { profileId: 1, isVisaOnboardingEnabled: true },
    ]);

    const mockHeaders = {
      'authorization': 'mock-token',
      'x-device-id': 'device-123',
    };

    const result: any = await service.fetchProfileMappingCount(mockHeaders);

    expect(mockProfileModel.findAll).toHaveBeenCalled();

    expect(mockSchemeServiceProxy.getVisaB2bMerchantOnboardingAvailability).toHaveBeenCalledWith([1], mockHeaders);

    expect(result[0].dataValues.isVisaOnboardingEnabled).toBe(true);
  });
  it('should set isVisaOnboardingEnabled to false when profile not returned from visa API', async () => {
    const mockProfiles = [
      {
        id: 2,
        dataValues: {
          id: 2,
          mappingCount: 1,
        },
      },
    ];

    mockProfileModel.findAll.mockResolvedValue(mockProfiles);

    mockSchemeServiceProxy.getVisaB2bMerchantOnboardingAvailability.mockResolvedValue([]);

    const result: any = await service.fetchProfileMappingCount({});

    expect(result[0].dataValues.isVisaOnboardingEnabled).toBe(false);
  });

  it('should throw HttpException if create throws SequelizeUniqueConstraintError', async () => {
    const error = { name: 'SequelizeUniqueConstraintError' };
    jest.spyOn(mockLogger, 'error').mockImplementation(() => {});
    mockOutletProfileMappingModel.create.mockRejectedValue(error);

    await expect(service.create({} as any)).rejects.toThrow('Outlet profile mapping already exists');

    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should throw HttpException if create fails with other error', async () => {
    const error = { name: 'SomethingElse' };
    mockOutletProfileMappingModel.create.mockRejectedValue(error);
    jest.spyOn(mockLogger, 'error').mockImplementation(() => {});

    await expect(service.create({} as any)).rejects.toThrow('Outlet profile mapping creation failed');
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should throw HttpException if update fails', async () => {
    mockOutletProfileMappingModel.update.mockRejectedValue(new Error('Update fail'));
    jest.spyOn(mockLogger, 'error').mockImplementation(() => {});

    await expect(service.updateByOutletIdProfileId({ outletId: 'o1', profileId: 'p1' } as any)).rejects.toThrow(
      'Outlet profile mapping update failed'
    );

    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should throw HttpException if delete fails', async () => {
    mockOutletProfileMappingModel.destroy.mockRejectedValue(new Error('Delete fail'));
    jest.spyOn(mockLogger, 'error').mockImplementation(() => {});

    await expect(service.deleteByOutletIdProfileId('o1', 'p1')).rejects.toThrow('Outlet profile mapping deletion failed');

    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should throw HttpException if fetchProfileMappingCount fails', async () => {
    const mockHeaders = {
      'authorization': 'mock-tock',
      'x-device-id': 'device-123',
    };
    mockProfileModel.findAll.mockRejectedValue(new Error('Fetch count failed'));
    jest.spyOn(mockLogger, 'error').mockImplementation(() => {});

    await expect(service.fetchProfileMappingCount(mockHeaders)).rejects.toThrow('Outlet profile mapping fetch failed');

    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should log error if findByOutletId fails', async () => {
    mockOutletProfileMappingModel.findAll.mockRejectedValue(new Error('DB error'));
    const loggerSpy = jest.spyOn(mockLogger, 'error').mockImplementation(() => {});

    const result = await service.findByOutletId('outlet-1');

    expect(result).toBeUndefined();
    expect(loggerSpy).toHaveBeenCalled();
  });

  it('should log an error if findAll throws in findByProfileId', async () => {
    const mockError = new Error('Database error');
    mockOutletProfileMappingModel.findAll.mockRejectedValue(mockError);

    await service.findByProfileId('test-profile-id');

    expect(mockLogger.error).toHaveBeenCalledWith('OutletProfileMappingService.findByProfileId method error', {
      error: mockError,
    });
  });

  it('should log an error if findAll throws in findAllOutletsByTransactionDate', async () => {
    const mockError = new Error('Database error');
    mockOutletProfileMappingModel.findAll.mockRejectedValue(mockError);

    await service.findAllOutletsByTransactionDate('outlet-123', new Date());

    expect(mockLogger.error).toHaveBeenCalledWith(
      'OutletProfileMappingService.findAllOutletsByTransactionDate method error',
      { error: mockError }
    );
  });

  it('should log an error if findAll throws in findAll', async () => {
    const mockError = new Error('Database error');
    mockOutletProfileMappingModel.findAll.mockRejectedValue(mockError);

    await service.findAll();

    expect(mockLogger.error).toHaveBeenCalledWith('OutletProfileMappingService.findAll method error', { error: mockError });
  });

  it('should log an error if findOne throws in findOne', async () => {
    const mockError = new Error('Database error');
    mockOutletProfileMappingModel.findOne = jest.fn().mockRejectedValue(mockError);

    await service.findOne('outlet-123', 'profile-456');

    expect(mockLogger.error).toHaveBeenCalledWith('OutletProfileMappingService.findOne method error', { error: mockError });
  });

  describe('OutletProfileMappingService > _getWhereCondition', () => {
    it('should return baseCondition if transactionDate is not provided', () => {
      const outletId = 'outlet-1';
      const profileId = 'profile-1';

      const result = (service as any)._getWhereCondition(outletId, profileId, undefined);

      expect(result).toEqual({
        outletId: 'outlet-1',
        isActive: true,
        profileId: 'profile-1',
      });
    });
  });
  describe('mapOutletToProfile', () => {
    const dto = {
      outletId: 'outlet-123',
      profileId: 'profile-456',
      merchantId: 'merchant-123',
      mapToProfile: true,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
    };
    const userId = 'user-789';

    const mockExistingMapping = {
      restore: jest.fn(),
      update: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();

      jest.spyOn(service as any, 'insertToOutletProfileMetadata').mockResolvedValue(undefined);

      service['searchServiceProxy' as any] = mockSearchServiceProxy;
      service['outletProfileService' as any] = mockOutletProfileService;

      jest.spyOn(service['sequelize'], 'transaction').mockImplementation(async (cb: any) => {
        return cb(mockTransaction);
      });
    });

    it('should create a new mapping inside transaction if none exists and mapToProfile is true', async () => {
      mockOutletProfileMappingModel.findOne.mockResolvedValue(null);
      mockOutletProfileMappingModel.create.mockResolvedValue({} as any);

      jest.spyOn(service['sequelize'] as any, 'transaction').mockImplementation(async (cb: any) => cb(mockTransaction));

      const result = await service.mapOutletToProfile(dto, userId);

      expect(mockOutletProfileMappingModel.findOne).toHaveBeenCalledWith({
        where: {
          outletId: dto.outletId,
          profileId: dto.profileId,
        },
        paranoid: false,
      });

      expect(mockOutletProfileMappingModel.create).toHaveBeenCalledWith(
        {
          outletId: dto.outletId,
          profileId: dto.profileId,
          isActive: true,
          startDate: dto.startDate,
          endDate: dto.endDate,
          updatedBy: userId,
        },
        { transaction: mockTransaction }
      );

      expect(service.insertToOutletProfileMetadata).toHaveBeenCalledWith(
        dto.outletId,
        dto.profileId,
        dto.merchantId,
        mockTransaction
      );

      expect(mockOutletOfferProxy.getOutletCurrentOfferForProfile).toHaveBeenCalledWith(dto.outletId, dto.profileId);

      expect(mockSearchServiceProxy.updateOutletStatus).toHaveBeenCalledWith(dto.outletId, dto.profileId, undefined);

      expect(result).toBe(true);
    });

    it('should restore and update an existing mapping inside transaction if found and mapToProfile is true', async () => {
      mockOutletProfileMappingModel.findOne.mockResolvedValue(mockExistingMapping);

      const result = await service.mapOutletToProfile(dto, userId);

      expect(mockExistingMapping.restore).toHaveBeenCalledWith({ transaction: mockTransaction });

      expect(mockExistingMapping.update).toHaveBeenCalledWith(
        {
          isActive: true,
          startDate: dto.startDate,
          endDate: dto.endDate,
          updatedBy: userId,
        },
        { transaction: mockTransaction }
      );

      expect(service.insertToOutletProfileMetadata).toHaveBeenCalledWith(
        dto.outletId,
        dto.profileId,
        dto.merchantId,
        mockTransaction
      );

      expect(mockOutletOfferProxy.getOutletCurrentOfferForProfile).toHaveBeenCalledWith(dto.outletId, dto.profileId);

      /** ✅ fixed */
      expect(mockSearchServiceProxy.updateOutletStatus).toHaveBeenCalledWith(dto.outletId, dto.profileId, undefined);

      expect(result).toBe(true);
    });

    it('should destroy mapping and update outlet profile status if mapToProfile is false', async () => {
      const unmapDto = { ...dto, mapToProfile: false };
      mockOutletProfileMappingModel.destroy.mockResolvedValue(1);

      const result = await service.mapOutletToProfile(unmapDto, userId);

      expect(mockOutletProfileMappingModel.destroy).toHaveBeenCalledWith({
        where: {
          outletId: dto.outletId,
          profileId: dto.profileId,
        },
      });
      expect(mockOutletProfileService.updateStatusForProfile).toHaveBeenCalledWith(dto.outletId, dto.profileId, 'Pending');

      expect(mockSearchServiceProxy.updateOutletStatus).toHaveBeenCalledWith(dto.outletId, dto.profileId, 'false');
      expect(result).toBe(true);
    });

    it('should log error and throw HttpException on failure', async () => {
      const error = new Error('DB error');
      mockOutletProfileMappingModel.findOne.mockRejectedValue(error);

      await expect(service.mapOutletToProfile(dto, userId)).rejects.toThrow(HttpException);
      expect(mockLogger.error).toHaveBeenCalledWith('OutletProfileMappingService.mapOutletToProfile error', { error });
    });

    it('should return created mapping when called from profile mapping flow', async () => {
      mockOutletProfileMappingModel.findOne.mockResolvedValue(null);
      const created = { id: 'm-created' };
      mockOutletProfileMappingModel.create.mockResolvedValue(created);

      const result = await service.mapOutletToProfile(dto as any, userId, true);

      expect(result).toEqual(created);
    });

    it('should call reward engine update when reward engine is enabled', async () => {
      (service as any).isRewardEngineEnabled = true;
      mockOutletProfileMappingModel.findOne.mockResolvedValue(null);
      mockOutletProfileMappingModel.create.mockResolvedValue({ id: 'new' });

      await service.mapOutletToProfile(dto as any, userId);

      expect(mockRewardEngineWrapperProxy.UpdateOutletMaxOfferForProfile).toHaveBeenCalledWith(dto.outletId, dto.profileId);
      expect(mockOutletOfferProxy.getOutletCurrentOfferForProfile).not.toHaveBeenCalled();
    });
  });

  describe('OutletProfileMappingService > findOneByTransactionDate', () => {
    const outletId = 'outlet-1';
    const profileId = 'profile-1';
    const transactionDate = new Date('2024-01-01T00:00:00Z');

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return the mapping if found and bin is not provided', async () => {
      const mapping = { outletId, profileId, allowedBins: undefined };
      mockOutletProfileMappingModel.findOne.mockResolvedValue(mapping);

      const result = await service.findOneByTransactionDate(outletId, profileId, transactionDate);

      expect(mockLogger.info).toHaveBeenCalledWith('OutletProfileMappingService.findOneByTransactionDate method called', {
        outletId,
        profileId,
      });
      expect(mockOutletProfileMappingModel.findOne).toHaveBeenCalled();
      expect(result).toBe(mapping);
    });

    it('should return the mapping if bin is provided and allowedBins is empty', async () => {
      const mapping = { outletId, profileId, allowedBins: [] };
      mockOutletProfileMappingModel.findOne.mockResolvedValue(mapping);

      const result = await service.findOneByTransactionDate(outletId, profileId, transactionDate, '123456');

      expect(result).toBe(mapping);
    });

    it('should return the mapping if bin is provided and allowedBins contains the bin', async () => {
      const mapping = { outletId, profileId, allowedBins: ['123456', '654321'] };
      mockOutletProfileMappingModel.findOne.mockResolvedValue(mapping);

      const result = await service.findOneByTransactionDate(outletId, profileId, transactionDate, '123456');

      expect(result).toBe(mapping);
    });

    it('should return null if bin is provided and allowedBins does not contain the bin', async () => {
      const mapping = { outletId, profileId, allowedBins: ['654321'] };
      mockOutletProfileMappingModel.findOne.mockResolvedValue(mapping);

      const result = await service.findOneByTransactionDate(outletId, profileId, transactionDate, '123456');

      expect(result).toBeNull();
    });

    it('should return null if no mapping is found', async () => {
      mockOutletProfileMappingModel.findOne.mockResolvedValue(null);

      const result = await service.findOneByTransactionDate(outletId, profileId, transactionDate);

      expect(result).toBeNull();
    });

    it('should log error and return null if findOne throws', async () => {
      const error = new Error('DB error');
      mockOutletProfileMappingModel.findOne.mockRejectedValue(error);

      const result = await service.findOneByTransactionDate(outletId, profileId, transactionDate);

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('OutletProfileMappingService.findOne method error', { error });
    });
  });
  describe('insertToOutletProfileMetadata', () => {
    const outletId = 'outlet-1';
    const profileId = 'profile-1';
    const merchantId = 'merchant-1';
    const transaction = {};

    it('should call insertOutletProfileMetadata with correct arguments', async () => {
      await service.insertToOutletProfileMetadata(outletId, profileId, merchantId, transaction as any);
      expect(mockOutletProfileService.insertOutletProfileMetadata).toHaveBeenCalledWith(
        outletId,
        profileId,
        merchantId,
        transaction
      );
    });

    it('should throw HttpException and log error if insert fails', async () => {
      const error = { response: 'Conflict', status: 409 };
      mockOutletProfileService.insertOutletProfileMetadata.mockRejectedValue(error);

      await expect(
        service.insertToOutletProfileMetadata(outletId, profileId, merchantId, transaction as any)
      ).rejects.toThrow(HttpException);

      expect(mockLogger.error).toHaveBeenCalledWith('OutletProfileMappingService.insertToOutletProfileMetadata failed', {
        error,
      });
    });

    it('should default to 500 status if error does not have a status', async () => {
      const error = new Error('Something went wrong');
      mockOutletProfileService.insertOutletProfileMetadata.mockRejectedValue(error);

      await expect(
        service.insertToOutletProfileMetadata(outletId, profileId, merchantId, transaction as any)
      ).rejects.toThrow(HttpException);
    });
  });

  describe('findOrCreate', () => {
    it('should call findOrCreate with correct where/defaults', async () => {
      const dto = {
        outletId: 'outlet-1',
        profileId: 'profile-1',
        updatedBy: 'user-1',
        isActive: true,
      };

      mockOutletProfileMappingModel.findOrCreate.mockResolvedValue(['result', true]);

      const result = await service.findOrCreate(dto as any);
      expect(result).toEqual(['result', true]);

      expect(mockOutletProfileMappingModel.findOrCreate).toHaveBeenCalledWith({
        where: {
          outletId: dto.outletId,
          profileId: dto.profileId,
        },
        defaults: {
          isActive: true,
          updatedBy: dto.updatedBy,
        },
      });
    });
  });

  describe('getMappedOutletDetails', () => {
    const profileId = 'profile-123';

    it('should return mapped outlet details on success', async () => {
      const mockData = [{ outletId: 'o1', profileId: 'p1' }];
      mockOutletProfileMappingModel.findAll.mockResolvedValue(mockData);

      const result = await service.getMappedOutletDetails(profileId);
      expect(result).toEqual(mockData);

      expect(mockOutletProfileMappingModel.findAll).toHaveBeenCalledWith({
        where: { profileId },
        attributes: ['outletId', 'startDate', 'endDate', 'profileId'],
      });
    });

    it('should throw HttpException on failure', async () => {
      mockOutletProfileMappingModel.findAll.mockRejectedValue(new Error('DB Error'));

      await expect(service.getMappedOutletDetails(profileId)).rejects.toThrow(HttpException);
    });
  });

  describe('getExpiredOutlets', () => {
    it('should return expired outlets between start and end time', async () => {
      const startTime = new Date('2025-10-05');
      const endTime = new Date('2025-10-05');
      const mockExpiredOutlets = [
        { outletId: 'outlet1', profileId: 'profile1', endDate: startTime },
        { outletId: 'outlet2', profileId: 'profile2', endDate: endTime },
      ];

      mockOutletProfileMappingModel.findAll.mockResolvedValue(mockExpiredOutlets);

      const result = await service.getExpiredOutlets(startTime, endTime);

      expect(result).toEqual(mockExpiredOutlets);
      expect(mockOutletProfileMappingModel.findAll).toHaveBeenCalledWith({
        where: {
          isActive: true,
          endDate: { [Op.between]: [startTime, endTime] },
        },
      });
      expect(mockLogger.info).toHaveBeenCalledWith('OutletProfileMappingService.getExpiredOutlets - starts', {
        startTime,
        endTime,
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        `OutletProfileMappingService.getExpiredOutlets - completed with count: ${mockExpiredOutlets.length}`
      );
    });

    it('should throw error and log when findAll fails', async () => {
      const startTime = new Date('2025-10-05');
      const endTime = new Date('2025-10-05');
      const error = new Error('DB error');

      mockOutletProfileMappingModel.findAll.mockRejectedValue(error);

      await expect(service.getExpiredOutlets(startTime, endTime)).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith('OutletProfileMappingService.getExpiredOutlets - exception', { error });
    });
  });

  describe('cloneToOutletProfileMetadata', () => {
    const outletId = 'outlet-123';
    const profileId = 'profile-456';
    const merchantId = 'merchant-789';
    const existingOutletId = 'existing-outlet-123';
    const transaction = mockTransaction;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully clone outlet profile metadata', async () => {
      const userId = 'user-123';
      mockOutletProfileService.cloneOutletProfileMetadata.mockResolvedValue(undefined);

      await service.cloneToOutletProfileMetadata(outletId, profileId, merchantId, existingOutletId, userId);

      expect(mockOutletProfileService.cloneOutletProfileMetadata).toHaveBeenCalledWith(
        outletId,
        profileId,
        merchantId,
        existingOutletId,
        userId,
        undefined
      );
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should successfully clone outlet profile metadata with transaction', async () => {
      const userId = 'user-123';
      mockOutletProfileService.cloneOutletProfileMetadata.mockResolvedValue(undefined);

      await service.cloneToOutletProfileMetadata(outletId, profileId, merchantId, existingOutletId, userId, transaction);

      expect(mockOutletProfileService.cloneOutletProfileMetadata).toHaveBeenCalledWith(
        outletId,
        profileId,
        merchantId,
        existingOutletId,
        userId,
        transaction
      );
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should throw HttpException and log error when cloneOutletProfileMetadata fails with error response and status', async () => {
      const userId = 'user-123';
      const error = {
        response: 'Failed to clone outlet profile metadata',
        status: 409,
      };
      mockOutletProfileService.cloneOutletProfileMetadata.mockRejectedValue(error);

      await expect(
        service.cloneToOutletProfileMetadata(outletId, profileId, merchantId, existingOutletId, userId)
      ).rejects.toThrow(HttpException);

      expect(mockOutletProfileService.cloneOutletProfileMetadata).toHaveBeenCalledWith(
        outletId,
        profileId,
        merchantId,
        existingOutletId,
        userId,
        undefined
      );
      expect(mockLogger.error).toHaveBeenCalledWith('OutletProfileMappingService.insertToOutletProfileMetadata failed', {
        error,
      });
    });

    it('should throw HttpException with default message when error has no response', async () => {
      const userId = 'user-123';
      const error = {
        status: 500,
      };
      mockOutletProfileService.cloneOutletProfileMetadata.mockRejectedValue(error);

      await expect(
        service.cloneToOutletProfileMetadata(outletId, profileId, merchantId, existingOutletId, userId)
      ).rejects.toThrow(HttpException);

      expect(mockLogger.error).toHaveBeenCalledWith('OutletProfileMappingService.insertToOutletProfileMetadata failed', {
        error,
      });
    });

    it('should throw HttpException with default status 500 when error has no status', async () => {
      const userId = 'user-123';
      const error = {
        response: 'Some error message',
      };
      mockOutletProfileService.cloneOutletProfileMetadata.mockRejectedValue(error);

      await expect(
        service.cloneToOutletProfileMetadata(outletId, profileId, merchantId, existingOutletId, userId)
      ).rejects.toThrow(HttpException);

      expect(mockLogger.error).toHaveBeenCalledWith('OutletProfileMappingService.insertToOutletProfileMetadata failed', {
        error,
      });
    });

    it('should throw HttpException with default message and status when error has neither response nor status', async () => {
      const userId = 'user-123';
      const error = new Error('Generic error');
      mockOutletProfileService.cloneOutletProfileMetadata.mockRejectedValue(error);

      await expect(
        service.cloneToOutletProfileMetadata(outletId, profileId, merchantId, existingOutletId, userId)
      ).rejects.toThrow(HttpException);

      expect(mockLogger.error).toHaveBeenCalledWith('OutletProfileMappingService.insertToOutletProfileMetadata failed', {
        error,
      });
    });
  });
});
