import { HttpException, HttpStatus } from '@nestjs/common';
import { MerchantPhotoService } from '../merchant-photo.service';

describe('MerchantPhotoService', () => {
  let service: MerchantPhotoService;

  const mockLogger = {
    error: jest.fn(),
  };

  const mockMerchantPhotoModel = {
    findByPk: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(() => {
    service = new MerchantPhotoService(mockMerchantPhotoModel as any, mockLogger as any);
    jest.clearAllMocks();
  });

  describe('deleteMerchantPhotoById', () => {
    it('should delete merchant photo if found', async () => {
      const photoId = 'photo-1';
      const mockPhoto = {
        destroy: jest.fn(),
      };
      mockMerchantPhotoModel.findByPk.mockResolvedValue(mockPhoto);

      const result = await service.deleteMerchantPhotoById(photoId);

      expect(mockMerchantPhotoModel.findByPk).toHaveBeenCalledWith(photoId);
      expect(mockPhoto.destroy).toHaveBeenCalled();
      expect(result).toEqual({ deleted: true });
    });

    it('should throw 404 if merchant photo not found', async () => {
      mockMerchantPhotoModel.findByPk.mockResolvedValue(null);

      await expect(service.deleteMerchantPhotoById('invalid-id')).rejects.toThrow(HttpException);
      try {
        await service.deleteMerchantPhotoById('invalid-id');
      } catch (err) {
        expect(err.getStatus()).toBe(HttpStatus.NOT_FOUND);
      }
    });

    it('should throw HttpException on unexpected error', async () => {
      const error = new Error('DB Error');
      mockMerchantPhotoModel.findByPk.mockRejectedValue(error);

      await expect(service.deleteMerchantPhotoById('photo-err')).rejects.toThrow(HttpException);
      expect(mockLogger.error).toHaveBeenCalledWith('MerchantPhotoService.deleteMerchantPhotoById failed', { error });
    });
  });

  describe('getMerchantPhotos', () => {
    it('should return merchant photos with expected attributes', async () => {
      const merchantId = 'merchant-123';
      const photos = [
        { id: '1', merchantId, cdnUrl: 'url-1' },
        { id: '2', merchantId, cdnUrl: 'url-2' },
      ];

      mockMerchantPhotoModel.findAll.mockResolvedValue(photos);

      const result = await service.getMerchantPhotos(merchantId);

      expect(mockMerchantPhotoModel.findAll).toHaveBeenCalledWith({
        where: {
          merchantId,
          isActive: true,
        },
        attributes: ['id', 'merchantId', 'cdnUrl', 'isDefault'],
      });

      expect(result).toEqual(photos);
    });

    it('should throw HttpException on error while fetching photos', async () => {
      const error = new Error('Failed to fetch');
      mockMerchantPhotoModel.findAll.mockRejectedValue(error);

      await expect(service.getMerchantPhotos('merchant-err')).rejects.toThrow(HttpException);
      expect(mockLogger.error).toHaveBeenCalledWith('MerchantProfileService.getMerchantProfilePhotos failed', { error });
    });
  });
});
