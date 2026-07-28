import { Test, TestingModule } from '@nestjs/testing';

import { baseResponseHelper } from 'src/helpers/base-response.helper';
import { OutletProfilePhotoDto } from 'src/outlet-profile/dtos/add-outlet-profile-photo.dto';
import { OutletProfilePhotosService } from 'src/outlet-profile/services/outlet-profile-photos.service';
import { OutletProfilePhotosController } from '../outlet-profile-photos.controller';


// Mock the baseResponseHelper
jest.mock('src/helpers/base-response.helper', () => ({
  baseResponseHelper: jest.fn((data) => ({
    success: true,
    data,
    message: 'Success'
  }))
}));

describe('OutletProfilePhotosController', () => {
  let controller: OutletProfilePhotosController;
  let service: OutletProfilePhotosService;

  const mockOutletProfilePhotosService = {
    getOutletProfilePhotos: jest.fn(),
    addOutletProfilePhoto: jest.fn(),
    deleteOutletProfilePhoto: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OutletProfilePhotosController],
      providers: [
        {
          provide: OutletProfilePhotosService,
          useValue: mockOutletProfilePhotosService,
        },
      ],
    }).compile();

    controller = module.get<OutletProfilePhotosController>(OutletProfilePhotosController);
    service = module.get<OutletProfilePhotosService>(OutletProfilePhotosService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GetOutletProfilePhotos', () => {
    const mockOutletProfileId = '123e4567-e89b-12d3-a456-426614174000';
    const mockPhotosData = [
      {
        id: '1',
        outletProfileId: mockOutletProfileId,
        photoUrl: 'https://example.com/photo1.jpg',
        createdAt: new Date(),
      },
      {
        id: '2',
        outletProfileId: mockOutletProfileId,
        photoUrl: 'https://example.com/photo2.jpg',
        createdAt: new Date(),
      },
    ];

    it('should successfully get outlet profile photos', async () => {
      // Arrange
      mockOutletProfilePhotosService.getOutletProfilePhotos.mockResolvedValue(mockPhotosData);
      const expectedResponse = {
        success: true,
        data: mockPhotosData,
        message: 'Success'
      };

      // Act
      const result = await controller.GetOutletProfilePhotos(mockOutletProfileId);

      // Assert
      expect(service.getOutletProfilePhotos).toHaveBeenCalledWith(mockOutletProfileId);
      expect(service.getOutletProfilePhotos).toHaveBeenCalledTimes(1);
      expect(baseResponseHelper).toHaveBeenCalledWith(mockPhotosData);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle empty photos array', async () => {
      // Arrange
      const emptyPhotosData: any[] = [];
      mockOutletProfilePhotosService.getOutletProfilePhotos.mockResolvedValue(emptyPhotosData);
      const expectedResponse = {
        success: true,
        data: emptyPhotosData,
        message: 'Success'
      };

      // Act
      const result = await controller.GetOutletProfilePhotos(mockOutletProfileId);

      // Assert
      expect(service.getOutletProfilePhotos).toHaveBeenCalledWith(mockOutletProfileId);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle service errors', async () => {
      // Arrange
      const mockError = new Error('Database connection failed');
      mockOutletProfilePhotosService.getOutletProfilePhotos.mockRejectedValue(mockError);

      // Act & Assert
      await expect(controller.GetOutletProfilePhotos(mockOutletProfileId)).rejects.toThrow('Database connection failed');
      expect(service.getOutletProfilePhotos).toHaveBeenCalledWith(mockOutletProfileId);
    });

    it('should handle invalid outlet profile ID format', async () => {
      // Arrange
      const invalidId = 'invalid-id';
      const mockError = new Error('Invalid ID format');
      mockOutletProfilePhotosService.getOutletProfilePhotos.mockRejectedValue(mockError);

      // Act & Assert
      await expect(controller.GetOutletProfilePhotos(invalidId)).rejects.toThrow('Invalid ID format');
      expect(service.getOutletProfilePhotos).toHaveBeenCalledWith(invalidId);
    });

    it('should handle null/undefined outlet profile ID', async () => {
      // Arrange
      const nullId = null as any;
      const mockError = new Error('Outlet profile ID is required');
      mockOutletProfilePhotosService.getOutletProfilePhotos.mockRejectedValue(mockError);

      // Act & Assert
      await expect(controller.GetOutletProfilePhotos(nullId)).rejects.toThrow('Outlet profile ID is required');
      expect(service.getOutletProfilePhotos).toHaveBeenCalledWith(nullId);
    });
  });


  describe('deleteOutletProfilePhoto', () => {
    const mockPhotoId = '123e4567-e89b-12d3-a456-426614174001';
    const mockDeleteResult = {
      id: mockPhotoId,
      deleted: true,
      deletedAt: new Date(),
    };

    it('should successfully delete outlet profile photo', async () => {
      // Arrange
      mockOutletProfilePhotosService.deleteOutletProfilePhoto.mockResolvedValue(mockDeleteResult);
      const expectedResponse = {
        success: true,
        data: mockDeleteResult,
        message: 'Success'
      };

      // Act
      const result = await controller.deleteOutletProfilePhoto(mockPhotoId);

      // Assert
      expect(service.deleteOutletProfilePhoto).toHaveBeenCalledWith(mockPhotoId);
      expect(service.deleteOutletProfilePhoto).toHaveBeenCalledTimes(1);
      expect(baseResponseHelper).toHaveBeenCalledWith(mockDeleteResult);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle photo not found errors', async () => {
      // Arrange
      const mockError = new Error('Photo not found');
      mockOutletProfilePhotosService.deleteOutletProfilePhoto.mockRejectedValue(mockError);

      // Act & Assert
      await expect(controller.deleteOutletProfilePhoto(mockPhotoId)).rejects.toThrow('Photo not found');
      expect(service.deleteOutletProfilePhoto).toHaveBeenCalledWith(mockPhotoId);
    });

    it('should handle invalid photo ID format', async () => {
      // Arrange
      const invalidId = 'invalid-photo-id';
      const mockError = new Error('Invalid photo ID format');
      mockOutletProfilePhotosService.deleteOutletProfilePhoto.mockRejectedValue(mockError);

      // Act & Assert
      await expect(controller.deleteOutletProfilePhoto(invalidId)).rejects.toThrow('Invalid photo ID format');
      expect(service.deleteOutletProfilePhoto).toHaveBeenCalledWith(invalidId);
    });

    it('should handle already deleted photo', async () => {
      // Arrange
      const mockError = new Error('Photo has already been deleted');
      mockOutletProfilePhotosService.deleteOutletProfilePhoto.mockRejectedValue(mockError);

      // Act & Assert
      await expect(controller.deleteOutletProfilePhoto(mockPhotoId)).rejects.toThrow('Photo has already been deleted');
      expect(service.deleteOutletProfilePhoto).toHaveBeenCalledWith(mockPhotoId);
    });

    it('should handle database errors during deletion', async () => {
      // Arrange
      const mockError = new Error('Database error during deletion');
      mockOutletProfilePhotosService.deleteOutletProfilePhoto.mockRejectedValue(mockError);

      // Act & Assert
      await expect(controller.deleteOutletProfilePhoto(mockPhotoId)).rejects.toThrow('Database error during deletion');
      expect(service.deleteOutletProfilePhoto).toHaveBeenCalledWith(mockPhotoId);
    });

    it('should handle null/undefined photo ID', async () => {
      // Arrange
      const nullId = null as any;
      const mockError = new Error('Photo ID is required');
      mockOutletProfilePhotosService.deleteOutletProfilePhoto.mockRejectedValue(mockError);

      // Act & Assert
      await expect(controller.deleteOutletProfilePhoto(nullId)).rejects.toThrow('Photo ID is required');
      expect(service.deleteOutletProfilePhoto).toHaveBeenCalledWith(nullId);
    });

    it('should handle permission denied errors', async () => {
      // Arrange
      const mockError = new Error('Insufficient permissions to delete this photo');
      mockOutletProfilePhotosService.deleteOutletProfilePhoto.mockRejectedValue(mockError);

      // Act & Assert
      await expect(controller.deleteOutletProfilePhoto(mockPhotoId)).rejects.toThrow('Insufficient permissions to delete this photo');
      expect(service.deleteOutletProfilePhoto).toHaveBeenCalledWith(mockPhotoId);
    });
  });



  describe('baseResponseHelper integration', () => {
    it('should always call baseResponseHelper with service response', async () => {
      // Arrange
      const mockData = { test: 'data' };
      mockOutletProfilePhotosService.getOutletProfilePhotos.mockResolvedValue(mockData);

      // Act
      await controller.GetOutletProfilePhotos('test-id');

      // Assert
      expect(baseResponseHelper).toHaveBeenCalledWith(mockData);
      expect(baseResponseHelper).toHaveBeenCalledTimes(1);
    });

    it('should handle baseResponseHelper errors', async () => {
      // Arrange
      const mockData = { test: 'data' };
      mockOutletProfilePhotosService.getOutletProfilePhotos.mockResolvedValue(mockData);
      (baseResponseHelper as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Response helper failed');
      });

      // Act & Assert
      await expect(controller.GetOutletProfilePhotos('test-id')).rejects.toThrow('Response helper failed');
    });
  });
});