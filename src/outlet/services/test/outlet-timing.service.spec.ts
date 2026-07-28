import { getModelToken } from '@nestjs/sequelize';
import { TestingModule, Test } from '@nestjs/testing';
import { OutletTiming } from 'src/outlet/models/outlet-timing.model';
import { OutletTimingService } from '../outlet-timing.service';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';
import { HttpException } from '@nestjs/common';
import { Transaction } from 'sequelize';

const mockOutletTimingModel = {
  create: jest.fn(),
  update: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
};

describe('OutletTimingService', () => {
  let service: OutletTimingService;
  let logger: CustomPinoLogger;
  let transactionMock: Transaction;
  const mockLogger = {
    error: jest.fn(),
    info: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutletTimingService,
        {
          provide: getModelToken(OutletTiming),
          useValue: mockOutletTimingModel,
        },
        { provide: CustomPinoLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<OutletTimingService>(OutletTimingService);
    logger = module.get<CustomPinoLogger>(CustomPinoLogger);
    transactionMock = {} as Transaction;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('insert', () => {
    it('should insert timing and return it', async () => {
      const dto = {
        weekdayText: [{ day: 'Monday', start: '10:00', end: '18:00' }],
        weekdayTextAr: null,
      };
      const mockCreated = { id: 1 };
      mockOutletTimingModel.update.mockResolvedValue([1, [{}]]);
      mockOutletTimingModel.create.mockResolvedValue(mockCreated);

      const result = await service.insert('outlet1', dto, {} as any, 'user1');

      expect(mockOutletTimingModel.update).toHaveBeenCalled();
      expect(mockOutletTimingModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          outletId: 'outlet1',
          isActive: true,
          updatedBy: 'user1',
        }),
        { transaction: {} }
      );
      expect(result).toBe(mockCreated);
    });
  });

  describe('cloneTiming', () => {
    const outlet_id = 'new-outlet-id';
    const existingOutletId = 'existing-outlet-id';
    const userId = 'test-user-id';

    it('should clone outlet timing when existing timing is active and has weekdayText', async () => {
      const existingTiming = {
        outletId: existingOutletId,
        weekdayText: 'Mon–Fri: 9 AM – 6 PM',
        weekdayTextAr: null, // fallback case
        isActive: true,
      };

      const createdTiming = {
        outletId: outlet_id,
        weekdayText: existingTiming.weekdayText,
        weekdayTextAr: existingTiming.weekdayText,
        isActive: true,
        updatedBy: userId,
      };

      const updateInactiveSpy = jest.spyOn(service, 'update_inactive').mockResolvedValue(undefined);

      jest.spyOn(mockOutletTimingModel, 'findOne').mockResolvedValue(existingTiming as any);

      jest.spyOn(mockOutletTimingModel, 'create').mockResolvedValue(createdTiming as any);

      const result = await service.cloneTiming(outlet_id, transactionMock, userId, existingOutletId);

      expect(mockOutletTimingModel.findOne).toHaveBeenCalledWith({
        where: {
          outletId: existingOutletId,
          isActive: true,
        },
        raw: true,
      });

      expect(updateInactiveSpy).toHaveBeenCalledWith(outlet_id, transactionMock, userId);

      expect(mockOutletTimingModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          outletId: outlet_id,
          weekdayText: existingTiming.weekdayText,
          weekdayTextAr: existingTiming.weekdayText, // fallback verified
          isActive: true,
          updatedBy: userId,
        }),
        { transaction: transactionMock }
      );

      expect(result).toEqual(createdTiming);
    });

    it('should NOT clone timing when weekdayText is missing', async () => {
      const existingTiming = {
        outletId: existingOutletId,
        weekdayText: null,
        isActive: true,
      };

      const updateInactiveSpy = jest.spyOn(service, 'update_inactive');

      jest.spyOn(mockOutletTimingModel, 'findOne').mockResolvedValue(existingTiming as any);

      const createSpy = jest.spyOn(mockOutletTimingModel, 'create');

      const result = await service.cloneTiming(outlet_id, transactionMock, userId, existingOutletId);

      expect(updateInactiveSpy).not.toHaveBeenCalled();
      expect(createSpy).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should throw HttpException when findOne fails', async () => {
      jest.spyOn(mockOutletTimingModel, 'findOne').mockRejectedValue(new Error('DB error'));

      await expect(service.cloneTiming(outlet_id, transactionMock, userId, existingOutletId)).rejects.toThrow(HttpException);
    });
  });

  describe('update_inactive', () => {
    it('should mark previous records as inactive', async () => {
      const mockUser = { id: 1 };
      mockOutletTimingModel.update.mockResolvedValue([1, [mockUser]]);

      const result = await service.update_inactive('outlet1', {} as any, 'user1');

      expect(mockOutletTimingModel.update).toHaveBeenCalledWith(
        { isActive: false, updatedBy: 'user1' },
        { where: { outletId: 'outlet1' }, returning: true, transaction: {} }
      );
      expect(result).toBe(mockUser);
    });
  });

  describe('update_timing', () => {
    it('should update timing by outlet_timing_id', async () => {
      mockOutletTimingModel.update.mockResolvedValue([1]);
      const result = await service.update_timing('timing1', [{ day: 'Monday', time: '10-18' }]);
      expect(mockOutletTimingModel.update).toHaveBeenCalledWith(
        { weekdayText: [{ day: 'Monday', time: '10-18' }] },
        { where: { outletTimingId: 'timing1' } }
      );
      expect(result).toEqual([1]);
    });
  });

  describe('find', () => {
    it('should return outlet timing', async () => {
      const mockTiming = { outletTimingId: '123' };
      mockOutletTimingModel.findOne.mockResolvedValue(mockTiming);
      const result = await service.find('outlet1');
      expect(mockOutletTimingModel.findOne).toHaveBeenCalledWith({ where: { outletId: 'outlet1' } });
      expect(result).toBe(mockTiming);
    });
  });

  describe('migrateTiming', () => {
    it('should call update_timing for valid entries', async () => {
      const outletTimings = [
        {
          outletTimingId: 'id1',
          weekdayText: [
            { day: 'Monday', start: '10:00', end: '18:00' },
            { day: 'Tuesday', start: null, end: null },
          ],
        },
      ];
      mockOutletTimingModel.findAll.mockResolvedValue(outletTimings);
      mockOutletTimingModel.update.mockResolvedValue([1]);

      const result = await service.migrateTiming();
      expect(mockOutletTimingModel.update).toHaveBeenCalled();
      expect(result).toEqual({ status: 'success' });
    });

    it('should skip if all mappings are invalid', async () => {
      const outletTimings = [
        {
          outletTimingId: 'id1',
          weekdayText: [{ day: 'Monday', start: null, end: null }],
        },
      ];
      mockOutletTimingModel.findAll.mockResolvedValue(outletTimings);
      const result = await service.migrateTiming();
      expect(result).toEqual({ status: 'success' });
    });
  });

  it('should handle insert with both weekdayText and weekdayTextAr', async () => {
    const dto = {
      weekdayText: [{ day: 'Monday', start: '10:00', end: '18:00' }],
      weekdayTextAr: [{ day: 'الاثنين', start: '10:00', end: '18:00' }],
    };
    const mockCreated = { id: 2 };
    mockOutletTimingModel.update.mockResolvedValue([1, [{}]]);
    mockOutletTimingModel.create.mockResolvedValue(mockCreated);

    const result = await service.insert('outlet1', dto, {} as any, 'user1');

    expect(mockOutletTimingModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        weekdayTextAr: expect.any(Array),
      }),
      { transaction: {} }
    );
    expect(result).toBe(mockCreated);
  });

  it('should log error if update_timing throws during migrateTiming', async () => {
    const outletTimings = [
      {
        outletTimingId: 'id1',
        weekdayText: [{ day: 'Monday', start: '10:00', end: '18:00' }],
      },
    ];
    mockOutletTimingModel.findAll.mockResolvedValue(outletTimings);
    jest.spyOn(service, 'update_timing').mockImplementation(() => {
      throw new Error('Update failed');
    });

    const result = await service.migrateTiming();

    expect(mockLogger.error).toHaveBeenCalledWith(
      'OutletTimingService.migrateTiming method error',
      expect.objectContaining({ ex: expect.any(Error) })
    );
    expect(result).toEqual({ status: 'success' });
  });
});
