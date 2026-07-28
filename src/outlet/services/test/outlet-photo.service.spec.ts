import { getModelToken } from '@nestjs/sequelize';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OutletPhotoService } from '../outlet-photo.service';
import { OutletPhoto } from '../../models/outlet-photo.model';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';
import { DataOperationsProducer } from 'src/kafka-services/data-operations.producer';

describe('OutletPhotoService', () => {
  let service: OutletPhotoService;
  let outletPhotoModel: any;
  let logger: any;

  const mockOutletPhotoModel = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    bulkCreate: jest.fn(),
  };

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
  };

  const mockDataOperationsProducer = {
    pushToAuditLogService: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutletPhotoService,
        {
          provide: getModelToken(OutletPhoto),
          useValue: mockOutletPhotoModel,
        },
        {
          provide: CustomPinoLogger,
          useValue: mockLogger,
        },
        {
          provide: DataOperationsProducer,
          useValue: mockDataOperationsProducer,
        },
      ],
    }).compile();

    service = module.get<OutletPhotoService>(OutletPhotoService);
    outletPhotoModel = module.get(getModelToken(OutletPhoto));
    logger = module.get(CustomPinoLogger);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('find', () => {
    it('should call findAll with correct query', async () => {
      const result = [{ outletPhotoId: '123' }];
      outletPhotoModel.findAll.mockResolvedValue(result);

      const response = await service.find('outlet-1');

      expect(outletPhotoModel.findAll).toHaveBeenCalledWith({
        where: { outletId: 'outlet-1', isActive: true },
      });
      expect(response).toBe(result);
    });
  });

  describe('findDefault', () => {
    it('should return the default outlet photo', async () => {
      const photo = { outletPhotoId: 'default123' };
      outletPhotoModel.findOne.mockResolvedValue(photo);

      const response = await service.findDefault('outlet-2');

      expect(outletPhotoModel.findOne).toHaveBeenCalledWith({
        where: {
          outletId: 'outlet-2',
          isActive: true,
          isDefault: true,
        },
      });
      expect(response).toBe(photo);
    });
  });

  describe('updateDefaultImage', () => {
    it('should throw NotFoundException if photo not found', async () => {
      outletPhotoModel.findByPk.mockResolvedValue(null);

      await expect(service.updateDefaultImage('missing-id')).rejects.toThrow(NotFoundException);
    });

    it('should update default image correctly', async () => {
      const mockPhoto = { outletPhotoId: '1', outletId: 'outlet-3' };
      const updatedPhoto = { outletPhotoId: '1', isDefault: true };

      outletPhotoModel.findByPk.mockResolvedValue(mockPhoto);
      outletPhotoModel.update.mockResolvedValueOnce([1, [{}]]).mockResolvedValueOnce([1, [updatedPhoto]]);

      const result = await service.updateDefaultImage('1');

      expect(result).toEqual(updatedPhoto);
      expect(outletPhotoModel.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteImage', () => {
    it('should throw NotFoundException if image not found', async () => {
      outletPhotoModel.destroy.mockResolvedValue(0);

      await expect(service.deleteImage('not-found')).rejects.toThrow(NotFoundException);
    });

    it('should delete the image successfully', async () => {
      outletPhotoModel.destroy.mockResolvedValue(1);

      const result = await service.deleteImage('img-1');
      expect(result).toBe(1);
      expect(outletPhotoModel.destroy).toHaveBeenCalledWith({
        where: { outletPhotoId: 'img-1' },
      });
    });
  });

  describe('changeImageOrder', () => {
    it('should update sort order for all images', async () => {
      const orderData = {
        orderData: [
          { outletPhotoId: 'img1', sortOrder: 1 },
          { outletPhotoId: 'img2', sortOrder: 2 },
        ],
      };

      outletPhotoModel.update.mockResolvedValue([1]);

      await service.changeImageOrder(orderData);

      expect(outletPhotoModel.update).toHaveBeenCalledTimes(2);
      expect(outletPhotoModel.update).toHaveBeenCalledWith({ sortOrder: 1 }, { where: { outletPhotoId: 'img1' } });
      expect(outletPhotoModel.update).toHaveBeenCalledWith({ sortOrder: 2 }, { where: { outletPhotoId: 'img2' } });
    });
  });

  describe('deselectDefaultImage', () => {
    it('should update all isDefault values to false', async () => {
      outletPhotoModel.update.mockResolvedValue([1, [{}]]);
      await service.deselectDefaultImage('outlet-5');

      expect(outletPhotoModel.update).toHaveBeenCalledWith(
        { isDefault: false },
        {
          where: { outletId: 'outlet-5', isDefault: true },
        }
      );
    });
  });

  describe('cloneOutletPhotos', () => {
    const mockTransaction = {} as any;

    it('should clone outlet photos successfully', async () => {
      const oldOutletId = 'old-123';
      const newOutletId = 'new-456';

      const mockPhotos = [
        {
          outletPhotoId: 'photo-1',
          outletId: oldOutletId,
          outlet_id: oldOutletId,
          imageUrl: 'test.jpg',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      outletPhotoModel.findAll.mockResolvedValue(mockPhotos);
      outletPhotoModel.bulkCreate.mockResolvedValue([]);

      await service.cloneOutletPhotos(oldOutletId, newOutletId, mockTransaction);

      expect(outletPhotoModel.findAll).toHaveBeenCalledWith({
        where: { outletId: oldOutletId },
        raw: true,
        transaction: mockTransaction,
      });

      expect(outletPhotoModel.bulkCreate).toHaveBeenCalledWith(
        [
          {
            outletId: newOutletId,
            outlet_id: newOutletId,
            imageUrl: 'test.jpg',
          },
        ],
        { transaction: mockTransaction }
      );

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('completed successfully'), {
        oldOutletId,
        newOutletId,
      });
    });

    it('should handle empty photo list', async () => {
      const oldOutletId = 'old-123';
      const newOutletId = 'new-456';

      outletPhotoModel.findAll.mockResolvedValue([]);
      outletPhotoModel.bulkCreate.mockResolvedValue([]);

      await service.cloneOutletPhotos(oldOutletId, newOutletId, mockTransaction);

      expect(outletPhotoModel.bulkCreate).toHaveBeenCalledWith([], {
        transaction: mockTransaction,
      });
    });

    it('should throw error if findAll fails', async () => {
      const oldOutletId = 'old-123';
      const newOutletId = 'new-456';
      const error = new Error('DB error');

      outletPhotoModel.findAll.mockRejectedValue(error);

      await expect(service.cloneOutletPhotos(oldOutletId, newOutletId, mockTransaction)).rejects.toThrow('DB error');

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('failed'), {
        oldOutletId,
        newOutletId,
        error,
      });
    });

    it('should push audit log when cloned photos include hero image', async () => {
      const oldOutletId = 'old-hero';
      const newOutletId = 'new-hero';
      outletPhotoModel.findAll.mockResolvedValue([
        {
          outletPhotoId: 'photo-1',
          outletId: oldOutletId,
          outlet_id: oldOutletId,
          imageUrl: 'test.jpg',
        },
      ]);
      outletPhotoModel.bulkCreate.mockResolvedValue([{ outletPhotoId: 'np1', isDefault: true }]);

      await service.cloneOutletPhotos(oldOutletId, newOutletId, mockTransaction);

      expect(mockDataOperationsProducer.pushToAuditLogService).toHaveBeenCalledWith(
        'mimojo-places-service',
        expect.objectContaining({ status: 'COMPLETED', values: expect.objectContaining({ isDefault: true }) }),
        expect.objectContaining({ audit_main_node_configuration_id: undefined })
      );
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('hero image found'), {
        oldOutletId,
        newOutletId,
      });
    });

    it('should not copy outletPhotoId, createdAt, updatedAt', async () => {
      const oldOutletId = 'old-123';
      const newOutletId = 'new-456';

      const mockPhotos = [
        {
          outletPhotoId: 'photo-1',
          outletId: oldOutletId,
          outlet_id: oldOutletId,
          imageUrl: 'test.jpg',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      outletPhotoModel.findAll.mockResolvedValue(mockPhotos);
      outletPhotoModel.bulkCreate.mockResolvedValue([]);

      await service.cloneOutletPhotos(oldOutletId, newOutletId, mockTransaction);

      const bulkCreateArg = outletPhotoModel.bulkCreate.mock.calls[0][0][0];

      expect(bulkCreateArg.outletPhotoId).toBeUndefined();
      expect(bulkCreateArg.createdAt).toBeUndefined();
      expect(bulkCreateArg.updatedAt).toBeUndefined();
    });
  });
});
