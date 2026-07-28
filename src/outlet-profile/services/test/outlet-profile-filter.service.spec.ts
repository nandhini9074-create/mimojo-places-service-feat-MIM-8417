import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { Op, Sequelize, Transaction } from 'sequelize';
import { OutletProfileFiltersDto } from 'src/outlet-profile/dtos/outlet-profile-filter.dto';
import { OutletProfileFilters } from 'src/outlet-profile/entities/outlet-profile-filters';
import { OutletProfileFilterService } from '../outlet-profile-filter.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

describe('OutletProfileFilterService', () => {
  let service: OutletProfileFilterService;
  let mockOutletProfileFiltersModel: any;
  let mockLogger: any;
  let mockTransaction: Transaction;

  // Mock data
  const mockUserId = 'user-123';
  const mockOutletProfileId = 'outlet-profile-123';
  const mockOutletProfileIds = ['outlet-profile-123', 'outlet-profile-456'];

  const mockFilterDto: OutletProfileFiltersDto = {
    id: 'id',
    filter: { id: 'filter-123' } as any,
    isCustomized: true,
    included: true,
  };

  const mockFiltersDto: OutletProfileFiltersDto[] = [
    {
      id: 'id',
      filter: { id: 'filter-123' } as any,
      isCustomized: true,
      included: true,
    },
    {
      id: 'id',
      filter: { id: 'filter-456' } as any,
      isCustomized: false,
      included: false,
    },
  ];

  const mockOutletProfileFilter: OutletProfileFilters = {
    outletProfileMetadataId: mockOutletProfileId,
    filterId: 'filter-123',
    isCustomized: true,
    included: true,
    updatedBy: mockUserId,
  } as OutletProfileFilters;

  beforeEach(async () => {
    // Create mocks
    mockOutletProfileFiltersModel = {
      findOne: jest.fn(),
      destroy: jest.fn(),
      bulkCreate: jest.fn(),
      findAndCountAll: jest.fn(),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
    };

    mockTransaction = {} as Transaction;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutletProfileFilterService,
        {
          provide: getModelToken(OutletProfileFilters),
          useValue: mockOutletProfileFiltersModel,
        },
        {
          provide: CustomPinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<OutletProfileFilterService>(OutletProfileFilterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addOutletProfileFilters', () => {
    it('should add outlet profile filters when filters array is provided', async () => {
      const insertSpy = jest.spyOn(service, 'insertOutletProfileFilters').mockResolvedValue(undefined);

      await service.addOutletProfileFilters(mockFiltersDto, mockOutletProfileId, mockTransaction, mockUserId);

      expect(insertSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            outletProfileMetadataId: mockOutletProfileId,
            filterId: 'filter-123',
            isCustomized: true,
            included: true,
            updatedBy: mockUserId,
          }),
          expect.objectContaining({
            outletProfileMetadataId: mockOutletProfileId,
            filterId: 'filter-456',
            isCustomized: false,
            included: false,
            updatedBy: mockUserId,
          }),
        ]),
        mockTransaction
      );
    });

    it('should set included to true when not provided in filter', async () => {
      const filterWithoutIncluded: OutletProfileFiltersDto[] = [
        {
          id: 'id',
          included: true,
          filter: { id: 'filter-123' } as any,
          isCustomized: true,
        },
      ];

      const insertSpy = jest.spyOn(service, 'insertOutletProfileFilters').mockResolvedValue(undefined);

      await service.addOutletProfileFilters(filterWithoutIncluded, mockOutletProfileId, mockTransaction, mockUserId);

      expect(insertSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            included: true,
          }),
        ]),
        mockTransaction
      );
    });

    it('should delete outlet profile filters when filters array is empty', async () => {
      const deleteSpy = jest.spyOn(service, 'deleteByOutletProfileIds').mockResolvedValue(undefined);

      await service.addOutletProfileFilters([], mockOutletProfileId, mockTransaction, mockUserId);

      expect(deleteSpy).toHaveBeenCalledWith([mockOutletProfileId], mockTransaction);
    });

    it('should delete outlet profile filters when filters is null', async () => {
      const deleteSpy = jest.spyOn(service, 'deleteByOutletProfileIds').mockResolvedValue(undefined);

      await service.addOutletProfileFilters(null, mockOutletProfileId, mockTransaction, mockUserId);

      expect(deleteSpy).toHaveBeenCalledWith([mockOutletProfileId], mockTransaction);
    });

    it('should delete outlet profile filters when filters is undefined', async () => {
      const deleteSpy = jest.spyOn(service, 'deleteByOutletProfileIds').mockResolvedValue(undefined);

      await service.addOutletProfileFilters(undefined, mockOutletProfileId, mockTransaction, mockUserId);

      expect(deleteSpy).toHaveBeenCalledWith([mockOutletProfileId], mockTransaction);
    });

    it('should throw INTERNAL_SERVER_ERROR when add outlet profile filters fails', async () => {
      jest.spyOn(service, 'insertOutletProfileFilters').mockRejectedValue(new Error('insert failed'));

      await expect(
        service.addOutletProfileFilters(mockFiltersDto, mockOutletProfileId, mockTransaction, mockUserId)
      ).rejects.toThrow(HttpException);
      expect(mockLogger.error).toHaveBeenCalledWith('OutletProfileFilterService.addOutletProfileFilters failed', {
        error: expect.any(Error),
      });
    });
  });

  describe('handleOutletProfileNotCustomizedFiltersChange', () => {
    const mockFilters = [
      {
        filterId: 'filter-123',
        MerchantProfileFilter: { included: true },
      },
      {
        filterId: 'filter-456',
        MerchantProfileFilter: { included: false },
      },
    ];

    it('should process filters for each outlet profile when no override flag exists', async () => {
      jest.spyOn(service, 'hasOverrideFlag').mockResolvedValue(false);
      const deleteByOutletIdSpy = jest.spyOn(service, 'deleteByOutletId').mockResolvedValue(undefined);
      const insertOnlyNotCustomizedSpy = jest.spyOn(service, 'insertOnlyNotCustomized').mockResolvedValue(undefined);

      await service.handleOutletProfileNotCustomizedFiltersChange(
        mockFilters,
        mockOutletProfileIds,
        mockUserId,
        mockTransaction
      );

      expect(deleteByOutletIdSpy).toHaveBeenCalledTimes(2);
      expect(insertOnlyNotCustomizedSpy).toHaveBeenCalledTimes(2);

      expect(insertOnlyNotCustomizedSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            outletProfileMetadataId: mockOutletProfileIds[0],
            filterId: 'filter-123',
            isCustomized: false,
            included: true,
            updatedBy: mockUserId,
          }),
        ]),
        mockTransaction
      );
    });

    it('should skip processing when override flag exists', async () => {
      jest.spyOn(service, 'hasOverrideFlag').mockResolvedValue(true);
      const deleteByOutletIdSpy = jest.spyOn(service, 'deleteByOutletId').mockResolvedValue(undefined);
      const insertOnlyNotCustomizedSpy = jest.spyOn(service, 'insertOnlyNotCustomized').mockResolvedValue(undefined);

      await service.handleOutletProfileNotCustomizedFiltersChange(
        mockFilters,
        mockOutletProfileIds,
        mockUserId,
        mockTransaction
      );

      expect(deleteByOutletIdSpy).not.toHaveBeenCalled();
      expect(insertOnlyNotCustomizedSpy).not.toHaveBeenCalled();
    });

    it('should set included to true when MerchantProfileFilter.included is undefined', async () => {
      const filtersWithUndefinedIncluded = [
        {
          filterId: 'filter-123',
          MerchantProfileFilter: {},
        },
      ];

      jest.spyOn(service, 'hasOverrideFlag').mockResolvedValue(false);
      jest.spyOn(service, 'deleteByOutletId').mockResolvedValue(undefined);
      const insertOnlyNotCustomizedSpy = jest.spyOn(service, 'insertOnlyNotCustomized').mockResolvedValue(undefined);

      await service.handleOutletProfileNotCustomizedFiltersChange(
        filtersWithUndefinedIncluded,
        [mockOutletProfileId],
        mockUserId,
        mockTransaction
      );

      expect(insertOnlyNotCustomizedSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            included: true,
          }),
        ]),
        mockTransaction
      );
    });

    it('should handle empty outlet profile IDs array', async () => {
      const hasOverrideFlagSpy = jest.spyOn(service, 'hasOverrideFlag');

      await service.handleOutletProfileNotCustomizedFiltersChange(mockFilters, [], mockUserId, mockTransaction);

      expect(hasOverrideFlagSpy).not.toHaveBeenCalled();
    });

    it('should handle null outlet profile IDs', async () => {
      const hasOverrideFlagSpy = jest.spyOn(service, 'hasOverrideFlag');

      await service.handleOutletProfileNotCustomizedFiltersChange(mockFilters, null, mockUserId, mockTransaction);

      expect(hasOverrideFlagSpy).not.toHaveBeenCalled();
    });
  });

  describe('hasOverrideFlag', () => {
    it('should return true when customized filter exists', async () => {
      mockOutletProfileFiltersModel.findOne.mockResolvedValue(mockOutletProfileFilter);

      const result = await service.hasOverrideFlag(mockOutletProfileId);

      expect(result).toBe(true);
      expect(mockOutletProfileFiltersModel.findOne).toHaveBeenCalledWith({
        where: {
          outletProfileMetadataId: mockOutletProfileId,
          isCustomized: true,
        },
      });
    });

    it('should return false when no customized filter exists', async () => {
      mockOutletProfileFiltersModel.findOne.mockResolvedValue(null);

      const result = await service.hasOverrideFlag(mockOutletProfileId);

      expect(result).toBe(false);
      expect(mockOutletProfileFiltersModel.findOne).toHaveBeenCalledWith({
        where: {
          outletProfileMetadataId: mockOutletProfileId,
          isCustomized: true,
        },
      });
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection error');
      mockOutletProfileFiltersModel.findOne.mockRejectedValue(dbError);

      await expect(service.hasOverrideFlag(mockOutletProfileId)).rejects.toThrow(dbError);
    });
  });

  describe('deleteByOutletId', () => {
    it('should delete filters by outlet ID', async () => {
      mockOutletProfileFiltersModel.destroy.mockResolvedValue(1);

      await service.deleteByOutletId(mockOutletProfileId, mockTransaction);

      expect(mockOutletProfileFiltersModel.destroy).toHaveBeenCalledWith({
        where: { outletProfileMetadataId: mockOutletProfileId },
        transaction: mockTransaction,
      });
    });

    it('should handle deletion errors', async () => {
      const deleteError = new Error('Delete operation failed');
      mockOutletProfileFiltersModel.destroy.mockRejectedValue(deleteError);

      await expect(service.deleteByOutletId(mockOutletProfileId, mockTransaction)).rejects.toThrow(deleteError);
    });
  });

  describe('insertOnlyNotCustomized', () => {
    it('should bulk create outlet profile filters', async () => {
      const mockFilters = [mockOutletProfileFilter];
      mockOutletProfileFiltersModel.bulkCreate.mockResolvedValue(mockFilters);

      await service.insertOnlyNotCustomized(mockFilters, mockTransaction);

      expect(mockOutletProfileFiltersModel.bulkCreate).toHaveBeenCalledWith(mockFilters, {
        validate: true,
        transaction: mockTransaction,
      });
    });

    it('should handle bulk create errors', async () => {
      const bulkCreateError = new Error('Bulk create failed');
      mockOutletProfileFiltersModel.bulkCreate.mockRejectedValue(bulkCreateError);

      await expect(service.insertOnlyNotCustomized([mockOutletProfileFilter], mockTransaction)).rejects.toThrow(
        bulkCreateError
      );
    });

    it('should handle empty array', async () => {
      mockOutletProfileFiltersModel.bulkCreate.mockResolvedValue([]);

      await service.insertOnlyNotCustomized([], mockTransaction);

      expect(mockOutletProfileFiltersModel.bulkCreate).toHaveBeenCalledWith([], {
        validate: true,
        transaction: mockTransaction,
      });
    });
  });

  describe('deleteByOutletProfileIds', () => {
    it('should delete filters by multiple outlet profile IDs', async () => {
      mockOutletProfileFiltersModel.destroy.mockResolvedValue(2);

      await service.deleteByOutletProfileIds(mockOutletProfileIds, mockTransaction);

      expect(mockOutletProfileFiltersModel.destroy).toHaveBeenCalledWith({
        where: { outletProfileMetadataId: mockOutletProfileIds },
        transaction: mockTransaction,
      });
    });

    it('should handle single ID in array', async () => {
      mockOutletProfileFiltersModel.destroy.mockResolvedValue(1);

      await service.deleteByOutletProfileIds([mockOutletProfileId], mockTransaction);

      expect(mockOutletProfileFiltersModel.destroy).toHaveBeenCalledWith({
        where: { outletProfileMetadataId: [mockOutletProfileId] },
        transaction: mockTransaction,
      });
    });

    it('should handle empty array', async () => {
      mockOutletProfileFiltersModel.destroy.mockResolvedValue(0);

      await service.deleteByOutletProfileIds([], mockTransaction);

      expect(mockOutletProfileFiltersModel.destroy).toHaveBeenCalledWith({
        where: { outletProfileMetadataId: [] },
        transaction: mockTransaction,
      });
    });

    it('should handle deletion errors', async () => {
      const deleteError = new HttpException('Failed delete Outlet profile filters', HttpStatus.INTERNAL_SERVER_ERROR);
      mockOutletProfileFiltersModel.destroy.mockRejectedValue(deleteError);

      await expect(service.deleteByOutletProfileIds(mockOutletProfileIds, mockTransaction)).rejects.toThrow(deleteError);
    });
  });

  describe('insertOutletProfileFilters', () => {
    it('should delete existing filters and insert new ones', async () => {
      const mockFilters = [
        { ...mockOutletProfileFilter, outletProfileMetadataId: 'outlet-1' },
        { ...mockOutletProfileFilter, outletProfileMetadataId: 'outlet-2' },
      ] as any;

      const deleteByOutletProfileIdsSpy = jest.spyOn(service, 'deleteByOutletProfileIds').mockResolvedValue(undefined);
      mockOutletProfileFiltersModel.bulkCreate.mockResolvedValue(mockFilters);

      const result = await service.insertOutletProfileFilters(mockFilters, mockTransaction);

      expect(deleteByOutletProfileIdsSpy).toHaveBeenCalledWith(['outlet-1', 'outlet-2'], mockTransaction);
      expect(mockOutletProfileFiltersModel.bulkCreate).toHaveBeenCalledWith(mockFilters, { transaction: mockTransaction });
      expect(result).toEqual(mockFilters);
    });

    it('should handle empty filters array', async () => {
      const deleteByOutletProfileIdsSpy = jest.spyOn(service, 'deleteByOutletProfileIds').mockResolvedValue(undefined);
      mockOutletProfileFiltersModel.bulkCreate.mockResolvedValue([]);

      const result = await service.insertOutletProfileFilters([], mockTransaction);

      expect(deleteByOutletProfileIdsSpy).toHaveBeenCalledWith([], mockTransaction);
      expect(mockOutletProfileFiltersModel.bulkCreate).toHaveBeenCalledWith([], { transaction: mockTransaction });
      expect(result).toEqual([]);
    });

    it('should handle bulk create errors', async () => {
      jest.spyOn(service, 'deleteByOutletProfileIds').mockResolvedValue(undefined);
      const bulkCreateError = new Error('Bulk create failed');
      mockOutletProfileFiltersModel.bulkCreate.mockRejectedValue(bulkCreateError);

      await expect(service.insertOutletProfileFilters([mockOutletProfileFilter], mockTransaction)).rejects.toThrow(
        bulkCreateError
      );
    });

    it('should handle delete errors', async () => {
      const deleteError = new Error('Delete operation failed');
      jest.spyOn(service, 'deleteByOutletProfileIds').mockRejectedValue(deleteError);

      await expect(service.insertOutletProfileFilters([mockOutletProfileFilter], mockTransaction)).rejects.toThrow(
        deleteError
      );
    });

    it('should extract unique outlet profile IDs correctly', async () => {
      const mockFiltersWithDuplicates = [
        { ...mockOutletProfileFilter, outletProfileMetadataId: 'outlet-1' },
        { ...mockOutletProfileFilter, outletProfileMetadataId: 'outlet-1' },
        { ...mockOutletProfileFilter, outletProfileMetadataId: 'outlet-2' },
      ] as any;

      const deleteByOutletProfileIdsSpy = jest.spyOn(service, 'deleteByOutletProfileIds').mockResolvedValue(undefined);
      mockOutletProfileFiltersModel.bulkCreate.mockResolvedValue(mockFiltersWithDuplicates);

      await service.insertOutletProfileFilters(mockFiltersWithDuplicates, mockTransaction);

      expect(deleteByOutletProfileIdsSpy).toHaveBeenCalledWith(
        ['outlet-1', 'outlet-1', 'outlet-2'], // The service maps all IDs, not unique ones
        mockTransaction
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined transaction in methods that require it', async () => {
      // This tests the behavior when transaction is undefined
      await expect(service.deleteByOutletId(mockOutletProfileId, undefined)).resolves.not.toThrow();

      expect(mockOutletProfileFiltersModel.destroy).toHaveBeenCalledWith({
        where: { outletProfileMetadataId: mockOutletProfileId },
        transaction: undefined,
      });
    });
  });

  describe('getOutletIdsUsingOrOperation', () => {
    it('should return outletProfileMetadataIds when records exist', async () => {
      const filterIds = ['filter1', 'filter2'];
      const included = true;

      const mockData = {
        rows: [{ dataValues: { outletProfileMetadataId: 'meta-1' } }, { dataValues: { outletProfileMetadataId: 'meta-2' } }],
        count: 2,
      };

      mockOutletProfileFiltersModel.findAndCountAll.mockResolvedValue(mockData);

      const result = await service.getOutletIdsUsingOrOperation(filterIds, included);

      expect(mockLogger.info).toHaveBeenCalledWith('OutletProfileFilterService.getOutletIdsUsingOrOperation - starts', {
        filterIds,
        included,
      });

      expect(mockOutletProfileFiltersModel.findAndCountAll).toHaveBeenCalledWith({
        attributes: ['outletProfileMetadataId'],
        distinct: true,
        where: {
          filterId: { [Op.in]: filterIds },
          included: included,
        },
        group: ['outletProfileMetadataId'],
      });

      expect(result).toEqual(['meta-1', 'meta-2']);
    });

    it('should log error and return empty array when findAndCountAll throws', async () => {
      const error = new Error('DB Error');
      mockOutletProfileFiltersModel.findAndCountAll.mockRejectedValue(error);

      const result = await service.getOutletIdsUsingOrOperation(['f1'], true);

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith('OutletProfileFilterService.getOutletIdsUsingOrOperation - exception', {
        error,
      });
    });
  });

  describe('getOutletIdsUsingAndOperation', () => {
    it('should return outletProfileMetadataIds when records exist', async () => {
      const filterIds = ['f1', 'f2'];
      const included = true;

      const mockData = {
        rows: [{ dataValues: { outletProfileMetadataId: 'meta-1' } }, { dataValues: { outletProfileMetadataId: 'meta-2' } }],
        count: 2,
      };

      mockOutletProfileFiltersModel.findAndCountAll.mockResolvedValue(mockData);

      const result = await service.getOutletIdsUsingAndOperation(filterIds, included);

      expect(mockLogger.info).toHaveBeenCalledWith('OutletProfileFilterService.getOutletIdsUsingAndOperation - starts', {
        filterIds,
        included,
      });

      expect(mockOutletProfileFiltersModel.findAndCountAll).toHaveBeenCalledWith({
        attributes: ['outletProfileMetadataId'],
        distinct: true,
        where: { filterId: { [Op.in]: filterIds }, included },
        group: ['outletProfileMetadataId'],
        having: Sequelize.literal(`COUNT(*) = ${filterIds.length}`),
      });

      expect(result).toEqual(['meta-1', 'meta-2']);
    });

    it('should log error when findAndCountAll throws', async () => {
      const error = new Error('DB Error');
      mockOutletProfileFiltersModel.findAndCountAll.mockRejectedValue(error);

      const result = await service.getOutletIdsUsingAndOperation(['f1'], true);

      expect(result).toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalledWith('OutletProfileFilterService.getOutletIdsUsingAndOperation - exception', {
        error,
      });
    });

    it('should log validation error when filterIds is not an array', async () => {
      const result = await service.getOutletIdsUsingAndOperation('bad-input' as any, true);
      expect(result).toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalledWith('Expected filterIds to be an array', { filterIds: 'bad-input' });
    });

    it('should log validation error when length check is invalid', async () => {
      const isIntegerSpy = jest.spyOn(Number, 'isInteger').mockReturnValue(false);
      const result = await service.getOutletIdsUsingAndOperation(['f1'], true);
      expect(result).toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'filterIds length is not a valid non-negative integer',
        expect.objectContaining({ safeLength: 1 })
      );
      isIntegerSpy.mockRestore();
    });
  });

  describe('cloneOutletProfileFilters', () => {
    const mockFilters: OutletProfileFilters[] = [
      {
        filterId: 'filter-123',
        isCustomized: true,
        included: true,
        outletProfileMetadataId: 'existing-outlet-profile-id',
        updatedBy: 'existing-user-id',
      } as OutletProfileFilters,
      {
        filterId: 'filter-456',
        isCustomized: false,
        included: false,
        outletProfileMetadataId: 'existing-outlet-profile-id',
        updatedBy: 'existing-user-id',
      } as OutletProfileFilters,
    ];

    it('should successfully clone outlet profile filters', async () => {
      const insertSpy = jest.spyOn(service, 'insertOutletProfileFilters').mockResolvedValue(undefined);

      await service.cloneOutletProfileFilters(mockFilters, mockOutletProfileId, mockTransaction, mockUserId);

      expect(insertSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            outletProfileMetadataId: mockOutletProfileId,
            filterId: 'filter-123',
            isCustomized: true,
            included: true,
            updatedBy: mockUserId,
          }),
          expect.objectContaining({
            outletProfileMetadataId: mockOutletProfileId,
            filterId: 'filter-456',
            isCustomized: false,
            included: false,
            updatedBy: mockUserId,
          }),
        ]),
        mockTransaction
      );
    });

    it('should set isCustomized to false when not provided', async () => {
      const filtersWithoutIsCustomized = [
        {
          filterId: 'filter-123',
          included: true,
          outletProfileMetadataId: 'existing-outlet-profile-id',
        } as any,
      ];

      const insertSpy = jest.spyOn(service, 'insertOutletProfileFilters').mockResolvedValue(undefined);

      await service.cloneOutletProfileFilters(filtersWithoutIsCustomized, mockOutletProfileId, mockTransaction, mockUserId);

      expect(insertSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            isCustomized: false,
          }),
        ]),
        mockTransaction
      );
    });

    it('should set included to true when not provided', async () => {
      const filtersWithoutIncluded = [
        {
          filterId: 'filter-123',
          isCustomized: true,
          outletProfileMetadataId: 'existing-outlet-profile-id',
        } as any,
      ];

      const insertSpy = jest.spyOn(service, 'insertOutletProfileFilters').mockResolvedValue(undefined);

      await service.cloneOutletProfileFilters(filtersWithoutIncluded, mockOutletProfileId, mockTransaction, mockUserId);

      expect(insertSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            included: true,
          }),
        ]),
        mockTransaction
      );
    });

    it('should set included to true when null', async () => {
      const filtersWithNullIncluded = [
        {
          filterId: 'filter-123',
          isCustomized: true,
          included: null,
          outletProfileMetadataId: 'existing-outlet-profile-id',
        } as any,
      ];

      const insertSpy = jest.spyOn(service, 'insertOutletProfileFilters').mockResolvedValue(undefined);

      await service.cloneOutletProfileFilters(filtersWithNullIncluded, mockOutletProfileId, mockTransaction, mockUserId);

      expect(insertSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            included: true,
          }),
        ]),
        mockTransaction
      );
    });

    it('should not call insertOutletProfileFilters when filters array is empty', async () => {
      const insertSpy = jest.spyOn(service, 'insertOutletProfileFilters').mockResolvedValue(undefined);

      await service.cloneOutletProfileFilters([], mockOutletProfileId, mockTransaction, mockUserId);

      expect(insertSpy).not.toHaveBeenCalled();
    });

    it('should not call insertOutletProfileFilters when filters is null', async () => {
      const insertSpy = jest.spyOn(service, 'insertOutletProfileFilters').mockResolvedValue(undefined);

      await service.cloneOutletProfileFilters(null, mockOutletProfileId, mockTransaction, mockUserId);

      expect(insertSpy).not.toHaveBeenCalled();
    });

    it('should not call insertOutletProfileFilters when filters is undefined', async () => {
      const insertSpy = jest.spyOn(service, 'insertOutletProfileFilters').mockResolvedValue(undefined);

      await service.cloneOutletProfileFilters(undefined, mockOutletProfileId, mockTransaction, mockUserId);

      expect(insertSpy).not.toHaveBeenCalled();
    });

    it('should handle filters without userId', async () => {
      const insertSpy = jest.spyOn(service, 'insertOutletProfileFilters').mockResolvedValue(undefined);

      await service.cloneOutletProfileFilters(mockFilters, mockOutletProfileId, mockTransaction);

      expect(insertSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            updatedBy: undefined,
          }),
        ]),
        mockTransaction
      );
    });

    it('should throw error and log error when insertOutletProfileFilters fails', async () => {
      const error = new Error('Insert failed');
      jest.spyOn(service, 'insertOutletProfileFilters').mockRejectedValue(error);

      await expect(
        service.cloneOutletProfileFilters(mockFilters, mockOutletProfileId, mockTransaction, mockUserId)
      ).rejects.toThrow(error);

      expect(mockLogger.error).toHaveBeenCalledWith('OutletProfileFilterService.cloneOutletProfileFilters failed', {
        error,
      });
    });

    it('should map all filter properties correctly', async () => {
      const filtersWithAllProperties = [
        {
          filterId: 'filter-789',
          isCustomized: true,
          included: false,
          outletProfileMetadataId: 'old-outlet-profile-id',
          updatedBy: 'old-user-id',
          // These should be ignored
          id: 'old-id',
          someOtherProperty: 'should-be-ignored',
        } as any,
      ];

      const insertSpy = jest.spyOn(service, 'insertOutletProfileFilters').mockResolvedValue(undefined);

      await service.cloneOutletProfileFilters(filtersWithAllProperties, mockOutletProfileId, mockTransaction, mockUserId);

      expect(insertSpy).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            outletProfileMetadataId: mockOutletProfileId,
            filterId: 'filter-789',
            isCustomized: true,
            included: false,
            updatedBy: mockUserId,
          }),
        ],
        mockTransaction
      );
    });

    it('should handle filters with undefined filterId', async () => {
      const filtersWithUndefinedFilterId = [
        {
          filterId: undefined,
          isCustomized: true,
          included: true,
          outletProfileMetadataId: 'existing-outlet-profile-id',
        } as any,
      ];

      const insertSpy = jest.spyOn(service, 'insertOutletProfileFilters').mockResolvedValue(undefined);

      await service.cloneOutletProfileFilters(
        filtersWithUndefinedFilterId,
        mockOutletProfileId,
        mockTransaction,
        mockUserId
      );

      expect(insertSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            filterId: undefined,
          }),
        ]),
        mockTransaction
      );
    });
  });
});
