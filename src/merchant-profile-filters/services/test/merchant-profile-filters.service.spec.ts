import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { MerchantProfileFilter } from 'src/merchant-profile-filters/entities/merchant-profile-filters.model';
import { MerchantProfileMetadataDto } from 'src/merchant-profile/dtos/create-merchant-profile-data.dto';
import { MerchantProfileStatusEnum } from 'src/merchant-profile/enums/merchant-profile-status-enum';
import { MerchantProfileFiltersService } from '../merchant-profile-filters.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';


describe('MerchantProfileFiltersService', () => {
  let service: MerchantProfileFiltersService;
  let mockMerchantProfileFilterModel: any;
  let mockLogger: any;
  let mockTransaction: Transaction;

  // Test data constants
  const mockMerchantProfileMetadataId = 'test-metadata-id';
  const mockUpdatedBy = 'test-user-id';

  beforeEach(async () => {
    // Mock the Sequelize model
    mockMerchantProfileFilterModel = {
      bulkCreate: jest.fn(),
      destroy: jest.fn()
    };

    // Mock the Pino logger
    mockLogger = {
      error: jest.fn(),
      info: jest.fn()
    };

    // Mock Sequelize transaction
    mockTransaction = {} as Transaction;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantProfileFiltersService,
        {
          provide: getModelToken(MerchantProfileFilter),
          useValue: mockMerchantProfileFilterModel,
        },
        {
          provide: CustomPinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<MerchantProfileFiltersService>(MerchantProfileFiltersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateMerchantProfileFilters', () => {
    const mockBulkCreateResult = { success: true };

    beforeEach(() => {
      jest.clearAllMocks();
      mockMerchantProfileFilterModel.bulkCreate.mockResolvedValue(mockBulkCreateResult);
      mockMerchantProfileFilterModel.destroy.mockResolvedValue(1);
    });

    it('should create included filters when filterIds are provided', async () => {
      const dto: MerchantProfileMetadataDto = {
        merchantId: 'merchant-123',
        profileId: 'profile-123',
        name: 'Test Merchant',
        filterIds: ['filter-1', 'filter-2', 'filter-3'],
        excludedFilterIds: [],
        isShariah: false
      };

      const expectedFilters = [
        { merchantProfileMetadataId: mockMerchantProfileMetadataId, filterId: 'filter-1', included: true, updatedBy: mockUpdatedBy },
        { merchantProfileMetadataId: mockMerchantProfileMetadataId, filterId: 'filter-2', included: true, updatedBy: mockUpdatedBy },
        { merchantProfileMetadataId: mockMerchantProfileMetadataId, filterId: 'filter-3', included: true, updatedBy: mockUpdatedBy },
      ];

      const result = await service.updateMerchantProfileFilters(dto, mockMerchantProfileMetadataId, mockUpdatedBy, mockTransaction);

      expect(mockMerchantProfileFilterModel.destroy).toHaveBeenCalledWith({
        where: { merchantProfileMetadataId: mockMerchantProfileMetadataId },
        transaction: mockTransaction,
      });

      expect(mockMerchantProfileFilterModel.bulkCreate).toHaveBeenCalledWith(expectedFilters, {
        transaction: mockTransaction,
      });

      expect(result).toBe(mockBulkCreateResult);
    });

    it('should create excluded filters when excludedFilterIds are provided', async () => {
      const dto: MerchantProfileMetadataDto = {
        merchantId: 'merchant-123',
        profileId: 'profile-123',
        name: 'Test Merchant',
        filterIds: [],
        excludedFilterIds: ['filter-4', 'filter-5'],
        isShariah: false
      };

      const expectedFilters = [
        { merchantProfileMetadataId: mockMerchantProfileMetadataId, filterId: 'filter-4', included: false, updatedBy: mockUpdatedBy },
        { merchantProfileMetadataId: mockMerchantProfileMetadataId, filterId: 'filter-5', included: false, updatedBy: mockUpdatedBy },
      ];

      const result = await service.updateMerchantProfileFilters(dto, mockMerchantProfileMetadataId, mockUpdatedBy, mockTransaction);

      expect(mockMerchantProfileFilterModel.bulkCreate).toHaveBeenCalledWith(expectedFilters, {
        transaction: mockTransaction,
      });

      expect(result).toBe(mockBulkCreateResult);
    });

    it('should create both included and excluded filters when both arrays are provided', async () => {
      const dto: MerchantProfileMetadataDto = {
        merchantId: 'merchant-123',
        profileId: 'profile-123',
        name: 'Test Merchant',
        filterIds: ['filter-1', 'filter-2'],
        excludedFilterIds: ['filter-3', 'filter-4'],
        isShariah: false
      };

      const expectedFilters = [
        { merchantProfileMetadataId: mockMerchantProfileMetadataId, filterId: 'filter-1', included: true, updatedBy: mockUpdatedBy },
        { merchantProfileMetadataId: mockMerchantProfileMetadataId, filterId: 'filter-2', included: true, updatedBy: mockUpdatedBy },
        { merchantProfileMetadataId: mockMerchantProfileMetadataId, filterId: 'filter-3', included: false, updatedBy: mockUpdatedBy },
        { merchantProfileMetadataId: mockMerchantProfileMetadataId, filterId: 'filter-4', included: false, updatedBy: mockUpdatedBy },
      ];

      const result = await service.updateMerchantProfileFilters(dto, mockMerchantProfileMetadataId, mockUpdatedBy, mockTransaction);

      expect(mockMerchantProfileFilterModel.bulkCreate).toHaveBeenCalledWith(expectedFilters, {
        transaction: mockTransaction,
      });

      expect(result).toBe(mockBulkCreateResult);
    });

    it('should return undefined if both filter arrays are empty', async () => {
      const dto: MerchantProfileMetadataDto = {
        merchantId: 'merchant-123',
        profileId: 'profile-123',
        name: 'Test Merchant',
        filterIds: [],
        excludedFilterIds: [],
        isShariah: false
      };

      const result = await service.updateMerchantProfileFilters(dto, mockMerchantProfileMetadataId, mockUpdatedBy, mockTransaction);

      expect(mockMerchantProfileFilterModel.destroy).toHaveBeenCalled();
      expect(mockMerchantProfileFilterModel.bulkCreate).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should handle DTO with optional fields populated', async () => {
      const dto: MerchantProfileMetadataDto = {
        merchantId: 'merchant-123',
        profileId: 'profile-123',
        name: 'Test Merchant',
        nameAr: 'اسم التاجر',
        maxOfferValue: 1000,
        status: MerchantProfileStatusEnum.READY,
        imageUrl: 'https://example.com/image.jpg',
        desc: 'Test description',
        descAr: 'وصف تجريبي',
        updatedBy: 'optional-user-id',
        filterIds: ['filter-1'],
        excludedFilterIds: ['filter-2'],
        isShariah: false
      };

      const expectedFilters = [
        { merchantProfileMetadataId: mockMerchantProfileMetadataId, filterId: 'filter-1', included: true, updatedBy: mockUpdatedBy },
        { merchantProfileMetadataId: mockMerchantProfileMetadataId, filterId: 'filter-2', included: false, updatedBy: mockUpdatedBy },
      ];

      const result = await service.updateMerchantProfileFilters(dto, mockMerchantProfileMetadataId, mockUpdatedBy, mockTransaction);

      expect(mockMerchantProfileFilterModel.bulkCreate).toHaveBeenCalledWith(expectedFilters, {
        transaction: mockTransaction,
      });

      expect(result).toBe(mockBulkCreateResult);
    });

    it('should log and throw error if destroy fails', async () => {
      const dto: MerchantProfileMetadataDto = {
        merchantId: 'merchant-123',
        profileId: 'profile-123',
        name: 'Test Merchant',
        filterIds: ['filter-1'],
        excludedFilterIds: [],
        isShariah: false
      };

      const mockDestroyError = new Error('Destroy failed');
      mockMerchantProfileFilterModel.destroy.mockRejectedValue(mockDestroyError);

      await expect(
        service.updateMerchantProfileFilters(dto, mockMerchantProfileMetadataId, mockUpdatedBy, mockTransaction)
      ).rejects.toThrow(
        new HttpException('Failed to update the filter details', HttpStatus.INTERNAL_SERVER_ERROR)
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'MerchantProfileFiltersService.updateMerchantProfileFilters failed',
        { error: mockDestroyError }
      );
    });
  });


});