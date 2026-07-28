import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { OutletProfilePhotoDto } from 'src/outlet-profile/dtos/add-outlet-profile-photo.dto';
import { OutletProfilePhotos } from 'src/outlet-profile/entities/outlet-profile-photos';
import { OutletProfilePhotosService } from '../outlet-profile-photos.service';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

describe('OutletProfilePhotosService', () => {
  let service: OutletProfilePhotosService;
  let outletProfilePhotosModel: jest.Mocked<typeof OutletProfilePhotos>;
  let logger: jest.Mocked<any>;

  const mockOutletProfilePhoto = {
    id: '1',
    outletProfileMetadataId: 'outlet-123',
    photoUrl: 'https://example.com/photo.jpg',
    caption: 'Test photo',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOutletProfilePhotoDto: OutletProfilePhotoDto = {
    outletProfileMetadataId: 'outlet-123',
    cdnUrl: 'https://example.com/photo.jpg',
    isActive: true,
  };

  beforeEach(async () => {
    const mockModel = {
      findAll: jest.fn(),
      create: jest.fn(),
      destroy: jest.fn(),
      update: jest.fn(),
      bulkCreate: jest.fn(),
    };

    const mockLogger = {
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutletProfilePhotosService,
        {
          provide: getModelToken(OutletProfilePhotos),
          useValue: mockModel,
        },
        {
          provide: CustomPinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<OutletProfilePhotosService>(OutletProfilePhotosService);
    outletProfilePhotosModel = module.get(getModelToken(OutletProfilePhotos));
    logger = module.get(CustomPinoLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOutletProfilePhotos', () => {
    it('should successfully return outlet profile photos', async () => {
      // Arrange
      const outletProfileId = 'outlet-123';
      const expectedPhotos = [mockOutletProfilePhoto];
      outletProfilePhotosModel.findAll.mockResolvedValue(expectedPhotos as any);

      // Act
      const result = await service.getOutletProfilePhotos(outletProfileId);

      // Assert
      expect(result).toEqual(expectedPhotos);
      expect(outletProfilePhotosModel.findAll).toHaveBeenCalledWith({
        where: {
          outletProfileMetadataId: outletProfileId,
          isActive: true,
          isDefault: false,
        },
      });
      expect(outletProfilePhotosModel.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no photos found', async () => {
      // Arrange
      const outletProfileId = 'outlet-123';
      outletProfilePhotosModel.findAll.mockResolvedValue([]);

      // Act
      const result = await service.getOutletProfilePhotos(outletProfileId);

      // Assert
      expect(result).toEqual([]);
      expect(outletProfilePhotosModel.findAll).toHaveBeenCalledWith({
        where: {
          outletProfileMetadataId: outletProfileId,
          isActive: true,
          isDefault: false,
        },
      });
    });

    it('should handle database errors and throw HttpException', async () => {
      // Arrange
      const outletProfileId = 'outlet-123';
      const dbError = new Error('Database connection failed');
      outletProfilePhotosModel.findAll.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.getOutletProfilePhotos(outletProfileId)).rejects.toThrow(
        new HttpException('Failed to fetch the outlet profile photos', HttpStatus.INTERNAL_SERVER_ERROR)
      );

      expect(logger.error).toHaveBeenCalledWith('OutletProfilePhotosService.getOutletProfilePhotos failed', {
        error: dbError,
      });
    });

    it('should handle null outletProfileId', async () => {
      // Arrange
      const outletProfileId = null as any;
      outletProfilePhotosModel.findAll.mockResolvedValue([]);

      // Act
      const result = await service.getOutletProfilePhotos(outletProfileId);

      // Assert
      expect(result).toEqual([]);
      expect(outletProfilePhotosModel.findAll).toHaveBeenCalledWith({
        where: {
          outletProfileMetadataId: null,
          isActive: true,
          isDefault: false,
        },
      });
    });

    it('should handle undefined outletProfileId', async () => {
      // Arrange
      const outletProfileId = undefined as any;
      outletProfilePhotosModel.findAll.mockResolvedValue([]);

      // Act
      const result = await service.getOutletProfilePhotos(outletProfileId);

      // Assert
      expect(result).toEqual([]);
      expect(outletProfilePhotosModel.findAll).toHaveBeenCalledWith({
        where: {
          outletProfileMetadataId: undefined,
          isActive: true,
          isDefault: false,
        },
      });
    });
  });

  describe('deleteOutletProfilePhoto', () => {
    it('should successfully delete outlet profile photo', async () => {
      // Arrange
      const photoId = '1';
      const deletedCount = 1;
      outletProfilePhotosModel.destroy.mockResolvedValue(deletedCount);

      // Act
      const result = await service.deleteOutletProfilePhoto(photoId);

      // Assert
      expect(result).toBe(deletedCount);
      expect(outletProfilePhotosModel.destroy).toHaveBeenCalledWith({
        where: {
          id: photoId,
        },
      });
      expect(outletProfilePhotosModel.destroy).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when photo does not exist', async () => {
      // Arrange
      const photoId = 'non-existent-id';
      const deletedCount = 0;
      outletProfilePhotosModel.destroy.mockResolvedValue(deletedCount);

      // Act & Assert
      await expect(service.deleteOutletProfilePhoto(photoId)).rejects.toThrow(
        new HttpException(`OutletProfilePhoto with id ${photoId} not found`, HttpStatus.NOT_FOUND)
      );

      expect(outletProfilePhotosModel.destroy).toHaveBeenCalledWith({
        where: {
          id: photoId,
        },
      });
    });

    it('should handle database errors during deletion', async () => {
      // Arrange
      const photoId = '1';
      const dbError = new Error('Database connection failed');
      outletProfilePhotosModel.destroy.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.deleteOutletProfilePhoto(photoId)).rejects.toThrow(
        new HttpException('Failed to delete outlet profile photo', HttpStatus.INTERNAL_SERVER_ERROR)
      );

      expect(outletProfilePhotosModel.destroy).toHaveBeenCalledWith({
        where: {
          id: photoId,
        },
      });
    });

    it('should handle HttpException errors with custom status and message', async () => {
      // Arrange
      const photoId = '1';
      const customError = new HttpException('Custom error message', HttpStatus.BAD_REQUEST);
      outletProfilePhotosModel.destroy.mockRejectedValue(customError);

      // Act & Assert
      await expect(service.deleteOutletProfilePhoto(photoId)).rejects.toThrow(
        new HttpException('Custom error message', HttpStatus.BAD_REQUEST)
      );
    });

    it('should handle NotFoundException from destroy operation', async () => {
      // Arrange
      const photoId = '1';
      const notFoundError = new NotFoundException('Record not found');
      outletProfilePhotosModel.destroy.mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(service.deleteOutletProfilePhoto(photoId)).rejects.toThrow(
        new HttpException('Record not found', HttpStatus.NOT_FOUND)
      );
    });

    it('should handle errors without response property', async () => {
      // Arrange
      const photoId = '1';
      const genericError = new Error('Generic error');
      outletProfilePhotosModel.destroy.mockRejectedValue(genericError);

      // Act & Assert
      await expect(service.deleteOutletProfilePhoto(photoId)).rejects.toThrow(
        new HttpException('Failed to delete outlet profile photo', HttpStatus.INTERNAL_SERVER_ERROR)
      );
    });

    it('should handle null photoId', async () => {
      // Arrange
      const photoId = null as any;
      const deletedCount = 0;
      outletProfilePhotosModel.destroy.mockResolvedValue(deletedCount);

      // Act & Assert
      await expect(service.deleteOutletProfilePhoto(photoId)).rejects.toThrow(
        new HttpException(`OutletProfilePhoto with id ${photoId} not found`, HttpStatus.NOT_FOUND)
      );

      expect(outletProfilePhotosModel.destroy).toHaveBeenCalledWith({
        where: { id: null },
      });
    });

    it('should handle undefined photoId', async () => {
      // Arrange
      const photoId = undefined as any;
      const deletedCount = 0;
      outletProfilePhotosModel.destroy.mockResolvedValue(deletedCount);

      // Act & Assert
      await expect(service.deleteOutletProfilePhoto(photoId)).rejects.toThrow(
        new HttpException(`OutletProfilePhoto with id ${photoId} not found`, HttpStatus.NOT_FOUND)
      );

      expect(outletProfilePhotosModel.destroy).toHaveBeenCalledWith({
        where: {
          id: undefined,
        },
      });
    });

    it('should delete multiple records if multiple match the ID', async () => {
      // Arrange
      const photoId = '1';
      const deletedCount = 2; // Multiple records deleted
      outletProfilePhotosModel.destroy.mockResolvedValue(deletedCount);

      // Act
      const result = await service.deleteOutletProfilePhoto(photoId);

      // Assert
      expect(result).toBe(deletedCount);
      expect(outletProfilePhotosModel.destroy).toHaveBeenCalledWith({
        where: {
          id: photoId,
        },
      });
    });
  });

  describe('Error handling edge cases', () => {
    it('should preserve original error status in deleteOutletProfilePhoto when error has status', async () => {
      // Arrange
      const photoId = '1';
      const errorWithStatus = {
        response: 'Forbidden access',
        status: HttpStatus.FORBIDDEN,
      };
      outletProfilePhotosModel.destroy.mockRejectedValue(errorWithStatus);

      // Act & Assert
      await expect(service.deleteOutletProfilePhoto(photoId)).rejects.toThrow(
        new HttpException('Forbidden access', HttpStatus.FORBIDDEN)
      );
    });

    it('should handle errors with only response property in deleteOutletProfilePhoto', async () => {
      // Arrange
      const photoId = '1';
      const errorWithOnlyResponse = {
        response: 'Only response error',
      };
      outletProfilePhotosModel.destroy.mockRejectedValue(errorWithOnlyResponse);

      // Act & Assert
      await expect(service.deleteOutletProfilePhoto(photoId)).rejects.toThrow(
        new HttpException('Only response error', HttpStatus.INTERNAL_SERVER_ERROR)
      );
    });

    it('should handle errors with only status property in deleteOutletProfilePhoto', async () => {
      // Arrange
      const photoId = '1';
      const errorWithOnlyStatus = {
        status: HttpStatus.CONFLICT,
      };
      outletProfilePhotosModel.destroy.mockRejectedValue(errorWithOnlyStatus);

      // Act & Assert
      await expect(service.deleteOutletProfilePhoto(photoId)).rejects.toThrow(
        new HttpException('Failed to delete outlet profile photo', HttpStatus.CONFLICT)
      );
    });
  });
  describe('deleteOutletProfilePhotosByOutletProfileId', () => {
    it('should delete photos by outlet profile ID', async () => {
      outletProfilePhotosModel.destroy.mockResolvedValue(3);
      const transaction = {} as any;

      const result = await service.deleteOutletProfilePhotosByOutletProfileId('profile-123', transaction);

      expect(outletProfilePhotosModel.destroy).toHaveBeenCalledWith({
        where: { outletProfileMetadataId: 'profile-123' },
        transaction,
      });
      expect(result).toBe(3);
    });
  });

  describe('insertDefaultOutletImages', () => {
    it('should insert mapped outlet photos with profile ID', async () => {
      const outletPhotos = [
        {
          cdnUrl: 'https://cdn/img1.jpg',
          sortOrder: 1,
          height: 100,
          width: 100,
          isActive: true,
          isDefault: true,
        },
      ];
      const outletProfileId = 'profile-456';
      const transaction = {} as any;

      await service.insertDefaultOutletImages(outletPhotos as any, outletProfileId, transaction);

      expect(outletProfilePhotosModel.bulkCreate).toHaveBeenCalledWith(
        [
          {
            cdnUrl: 'https://cdn/img1.jpg',
            sortOrder: 1,
            height: 100,
            width: 100,
            isActive: true,
            isDefault: true,
            outletProfileMetadataId: outletProfileId,
          },
        ],
        { transaction }
      );
    });
  });

  describe('changeImageOrder', () => {
    it('should update sort order for all given outlet photo IDs', async () => {
      const orderData = {
        orderData: [
          { outletPhotoId: 'img-1', sortOrder: 1 },
          { outletPhotoId: 'img-2', sortOrder: 2 },
        ],
      };

      outletProfilePhotosModel.update.mockResolvedValue([1]);

      await service.changeImageOrder(orderData);

      expect(outletProfilePhotosModel.update).toHaveBeenCalledTimes(2);
      expect(outletProfilePhotosModel.update).toHaveBeenCalledWith({ sortOrder: 1 }, { where: { id: 'img-1' } });
      expect(outletProfilePhotosModel.update).toHaveBeenCalledWith({ sortOrder: 2 }, { where: { id: 'img-2' } });
    });

    it('should throw HttpException if update fails', async () => {
      outletProfilePhotosModel.update.mockRejectedValue(new Error('DB error'));

      const orderData = {
        orderData: [{ outletPhotoId: 'img-1', sortOrder: 1 }],
      };

      await expect(service.changeImageOrder(orderData)).rejects.toThrow(
        new HttpException('Failed to change image order ', HttpStatus.INTERNAL_SERVER_ERROR)
      );
    });
  });

  describe('cloneProfileOutletImages', () => {
    const mockTransaction = {} as any;
    const mockOutletProfileId = 'new-outlet-profile-123';

    const mockExistingOutletProfilePhotos = [
      {
        id: 'photo-1',
        cdnUrl: 'https://cdn.example.com/photo1.jpg',
        sortOrder: 1,
        height: 800,
        width: 600,
        isActive: true,
        isDefault: true,
        outletProfileMetadataId: 'old-outlet-profile-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'photo-2',
        cdnUrl: 'https://cdn.example.com/photo2.jpg',
        sortOrder: 2,
        height: 1200,
        width: 900,
        isActive: true,
        isDefault: false,
        outletProfileMetadataId: 'old-outlet-profile-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any;

    it('should successfully clone outlet profile images', async () => {
      outletProfilePhotosModel.bulkCreate.mockResolvedValue(mockExistingOutletProfilePhotos as any);

      await service.cloneProfileOutletImages(mockExistingOutletProfilePhotos, mockOutletProfileId, mockTransaction);

      expect(outletProfilePhotosModel.bulkCreate).toHaveBeenCalledWith(
        [
          {
            cdnUrl: 'https://cdn.example.com/photo1.jpg',
            sortOrder: 1,
            height: 800,
            width: 600,
            isActive: true,
            isDefault: true,
            outletProfileMetadataId: mockOutletProfileId,
          },
          {
            cdnUrl: 'https://cdn.example.com/photo2.jpg',
            sortOrder: 2,
            height: 1200,
            width: 900,
            isActive: true,
            isDefault: false,
            outletProfileMetadataId: mockOutletProfileId,
          },
        ],
        { transaction: mockTransaction }
      );
    });

    it('should handle empty array of photos', async () => {
      outletProfilePhotosModel.bulkCreate.mockResolvedValue([]);

      await service.cloneProfileOutletImages([], mockOutletProfileId, mockTransaction);

      expect(outletProfilePhotosModel.bulkCreate).toHaveBeenCalledWith([], { transaction: mockTransaction });
    });

    it('should map all photo properties correctly', async () => {
      const photosWithAllProperties = [
        {
          id: 'photo-3',
          cdnUrl: 'https://cdn.example.com/photo3.jpg',
          sortOrder: 3,
          height: 1000,
          width: 750,
          isActive: false,
          isDefault: false,
          outletProfileMetadataId: 'old-profile-id',
          // These should be ignored
          createdAt: new Date(),
          updatedAt: new Date(),
          someOtherProperty: 'should-be-ignored',
        } as any,
      ];

      outletProfilePhotosModel.bulkCreate.mockResolvedValue(photosWithAllProperties as any);

      await service.cloneProfileOutletImages(photosWithAllProperties, mockOutletProfileId, mockTransaction);

      expect(outletProfilePhotosModel.bulkCreate).toHaveBeenCalledWith(
        [
          {
            cdnUrl: 'https://cdn.example.com/photo3.jpg',
            sortOrder: 3,
            height: 1000,
            width: 750,
            isActive: false,
            isDefault: false,
            outletProfileMetadataId: mockOutletProfileId,
          },
        ],
        { transaction: mockTransaction }
      );
    });

    it('should handle photos with null values', async () => {
      const photosWithNulls = [
        {
          id: 'photo-4',
          cdnUrl: 'https://cdn.example.com/photo4.jpg',
          sortOrder: null,
          height: null,
          width: null,
          isActive: null,
          isDefault: null,
          outletProfileMetadataId: 'old-profile-id',
        } as any,
      ];

      outletProfilePhotosModel.bulkCreate.mockResolvedValue(photosWithNulls as any);

      await service.cloneProfileOutletImages(photosWithNulls, mockOutletProfileId, mockTransaction);

      expect(outletProfilePhotosModel.bulkCreate).toHaveBeenCalledWith(
        [
          {
            cdnUrl: 'https://cdn.example.com/photo4.jpg',
            sortOrder: null,
            height: null,
            width: null,
            isActive: null,
            isDefault: null,
            outletProfileMetadataId: mockOutletProfileId,
          },
        ],
        { transaction: mockTransaction }
      );
    });

    it('should handle photos with undefined values', async () => {
      const photosWithUndefined = [
        {
          id: 'photo-5',
          cdnUrl: 'https://cdn.example.com/photo5.jpg',
          sortOrder: undefined,
          height: undefined,
          width: undefined,
          isActive: undefined,
          isDefault: undefined,
          outletProfileMetadataId: 'old-profile-id',
        } as any,
      ];

      outletProfilePhotosModel.bulkCreate.mockResolvedValue(photosWithUndefined as any);

      await service.cloneProfileOutletImages(photosWithUndefined, mockOutletProfileId, mockTransaction);

      expect(outletProfilePhotosModel.bulkCreate).toHaveBeenCalledWith(
        [
          {
            cdnUrl: 'https://cdn.example.com/photo5.jpg',
            sortOrder: undefined,
            height: undefined,
            width: undefined,
            isActive: undefined,
            isDefault: undefined,
            outletProfileMetadataId: mockOutletProfileId,
          },
        ],
        { transaction: mockTransaction }
      );
    });

    it('should handle single photo', async () => {
      const singlePhoto = [mockExistingOutletProfilePhotos[0]];

      outletProfilePhotosModel.bulkCreate.mockResolvedValue(singlePhoto as any);

      await service.cloneProfileOutletImages(singlePhoto, mockOutletProfileId, mockTransaction);

      expect(outletProfilePhotosModel.bulkCreate).toHaveBeenCalledWith(
        [
          {
            cdnUrl: 'https://cdn.example.com/photo1.jpg',
            sortOrder: 1,
            height: 800,
            width: 600,
            isActive: true,
            isDefault: true,
            outletProfileMetadataId: mockOutletProfileId,
          },
        ],
        { transaction: mockTransaction }
      );
    });

    it('should handle multiple photos with different properties', async () => {
      const multiplePhotos = [
        {
          cdnUrl: 'https://cdn.example.com/photo-a.jpg',
          sortOrder: 0,
          height: 500,
          width: 500,
          isActive: true,
          isDefault: true,
          outletProfileMetadataId: 'old-id',
        },
        {
          cdnUrl: 'https://cdn.example.com/photo-b.jpg',
          sortOrder: 10,
          height: 2000,
          width: 1500,
          isActive: false,
          isDefault: false,
          outletProfileMetadataId: 'old-id',
        },
        {
          cdnUrl: 'https://cdn.example.com/photo-c.jpg',
          sortOrder: 5,
          height: 1080,
          width: 1920,
          isActive: true,
          isDefault: false,
          outletProfileMetadataId: 'old-id',
        },
      ] as any;

      outletProfilePhotosModel.bulkCreate.mockResolvedValue(multiplePhotos as any);

      await service.cloneProfileOutletImages(multiplePhotos, mockOutletProfileId, mockTransaction);

      expect(outletProfilePhotosModel.bulkCreate).toHaveBeenCalledWith(
        [
          {
            cdnUrl: 'https://cdn.example.com/photo-a.jpg',
            sortOrder: 0,
            height: 500,
            width: 500,
            isActive: true,
            isDefault: true,
            outletProfileMetadataId: mockOutletProfileId,
          },
          {
            cdnUrl: 'https://cdn.example.com/photo-b.jpg',
            sortOrder: 10,
            height: 2000,
            width: 1500,
            isActive: false,
            isDefault: false,
            outletProfileMetadataId: mockOutletProfileId,
          },
          {
            cdnUrl: 'https://cdn.example.com/photo-c.jpg',
            sortOrder: 5,
            height: 1080,
            width: 1920,
            isActive: true,
            isDefault: false,
            outletProfileMetadataId: mockOutletProfileId,
          },
        ],
        { transaction: mockTransaction }
      );
    });

    it('should use new outletProfileMetadataId for all photos', async () => {
      const photosWithOldId = [
        {
          cdnUrl: 'https://cdn.example.com/photo1.jpg',
          sortOrder: 1,
          height: 800,
          width: 600,
          isActive: true,
          isDefault: true,
          outletProfileMetadataId: 'old-outlet-profile-999',
        },
        {
          cdnUrl: 'https://cdn.example.com/photo2.jpg',
          sortOrder: 2,
          height: 1200,
          width: 900,
          isActive: true,
          isDefault: false,
          outletProfileMetadataId: 'old-outlet-profile-999',
        },
      ] as any;

      outletProfilePhotosModel.bulkCreate.mockResolvedValue(photosWithOldId as any);

      await service.cloneProfileOutletImages(photosWithOldId, mockOutletProfileId, mockTransaction);

      expect(outletProfilePhotosModel.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            outletProfileMetadataId: mockOutletProfileId,
          }),
          expect.objectContaining({
            outletProfileMetadataId: mockOutletProfileId,
          }),
        ]),
        { transaction: mockTransaction }
      );
    });

    it('should handle bulkCreate errors', async () => {
      const bulkCreateError = new Error('Bulk create failed');
      outletProfilePhotosModel.bulkCreate.mockRejectedValue(bulkCreateError);

      await expect(
        service.cloneProfileOutletImages(mockExistingOutletProfilePhotos, mockOutletProfileId, mockTransaction)
      ).rejects.toThrow(bulkCreateError);

      expect(outletProfilePhotosModel.bulkCreate).toHaveBeenCalled();
    });
  });
});
