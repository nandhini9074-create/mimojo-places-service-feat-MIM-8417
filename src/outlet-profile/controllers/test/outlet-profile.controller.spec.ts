import { Test, TestingModule } from '@nestjs/testing';
import { baseResponseHelper } from 'src/helpers/base-response.helper';
import { UpdateOutletProfileStatusDto } from 'src/outlet-profile/dtos/update-outlet-profile-status.dto';
import { OutletProfileService } from 'src/outlet-profile/services/outlet-profile.service';
import { CreateOutletProfileDto } from 'src/outlet-profile/dtos/create-outlet-profile-metadata.dto';
import { GetOutletDto } from 'src/outlet/dtos/get-outlet-dto';
import { OutletStatusEnum } from 'src/outlet/enums/outlet-status-enum';
import { OutletProfileController } from '../outlet-profile.controller';
import { OutletProfileStatusEnum } from 'src/outlet-profile/enums/outlet-profile-enum';
import { OutletService } from 'src/outlet/services/outlet.service';
import { HttpException, HttpStatus } from '@nestjs/common';

// Mock the baseResponseHelper
jest.mock('src/helpers/base-response.helper', () => ({
  baseResponseHelper: jest.fn(),
}));

describe('OutletProfileController', () => {
  let controller: OutletProfileController;
  let service: OutletProfileService;

  const mockOutletProfileService = {
    getOutletProfileMetadata: jest.fn(),
    getProfileOutlets: jest.fn(),
    createOrUpdateOutletProfileMetadata: jest.fn(),
    validateAndUpdateOutletProfileStatus: jest.fn(),
    getOutletDetailsMetadata: jest.fn(),
    updateOutletProfileCountByMerchant: jest.fn(),
    resetOutletProfileDetails: jest.fn(),
    getOutletStatusByProfileId: jest.fn(),
  };
  const mockOutletService = {
    createOutletProfileById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OutletProfileController],
      providers: [
        {
          provide: OutletProfileService,
          useValue: mockOutletProfileService,
        },
        {
          provide: OutletService,
          useValue: mockOutletService,
        },
      ],
    }).compile();

    controller = module.get<OutletProfileController>(OutletProfileController);
    service = module.get<OutletProfileService>(OutletProfileService);

    // Clear all mocks before each test
    jest.clearAllMocks();

    // Setup baseResponseHelper mock implementation
    (baseResponseHelper as jest.Mock).mockImplementation(data => ({
      success: true,
      data,
      message: 'Operation successful',
    }));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getOutletProfileMetadata', () => {
    const outletId = 'outletId';
    const profileId = 'profileId';
    const mockMetadata = {
      id: 'outlet-profile-id',
      name: 'Test Outlet',
      description: 'Test Description',
      status: 'active',
    };
    const mockReq = {
      headers: 'token',
    } as any;

    it('should successfully get outlet profile metadata', async () => {
      // Arrange
      mockOutletProfileService.getOutletProfileMetadata.mockResolvedValue(mockMetadata);

      // Act
      const result = await controller.getOutletProfileMetadata(outletId, profileId, mockReq);

      // Assert
      expect(service.getOutletProfileMetadata).toHaveBeenCalledWith(outletId, profileId, 'token');
      expect(service.getOutletProfileMetadata).toHaveBeenCalledTimes(1);
      expect(baseResponseHelper).toHaveBeenCalledWith(mockMetadata);
      expect(result).toEqual({
        success: true,
        data: mockMetadata,
        message: 'Operation successful',
      });
    });

    it('should handle service errors when getting outlet profile metadata', async () => {
      // Arrange
      const error = new Error('Service error');
      mockOutletProfileService.getOutletProfileMetadata.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getOutletProfileMetadata(outletId, profileId, mockReq)).rejects.toThrow('Service error');
      expect(service.getOutletProfileMetadata).toHaveBeenCalledWith(outletId, profileId, 'token');
      expect(service.getOutletProfileMetadata).toHaveBeenCalledTimes(1);
    });

    it('should handle empty profileOutletId', async () => {
      // Arrange
      const emptyId = '';
      const emptyOutletId = '';
      const emptyProfileId = '';
      mockOutletProfileService.getOutletProfileMetadata.mockResolvedValue(null);

      // Act
      await controller.getOutletProfileMetadata(emptyOutletId, emptyProfileId, mockReq);

      // Assert
      expect(service.getOutletProfileMetadata).toHaveBeenCalledWith(emptyOutletId, emptyProfileId, 'token');
      expect(baseResponseHelper).toHaveBeenCalledWith(null);
    });
  });

  describe('getProfileOutlets', () => {
    const merchantId = '123e4567-e89b-12d3-a456-426614174000';
    const profileId = 'profile-id';
    const mockDto: GetOutletDto = {
      pageIndex: 0,
      pageSize: 10,
      search: 'test',
      status: OutletStatusEnum.Active,
      profileId: '123e4567-e89b-12d3-a456-426614174001',
    } as any;
    const mockHeaders = {
      'authorization': '<mock-token>',
      'content-type': 'application/json',
    };
    const mockRequest = { headers: mockHeaders } as any;
    const mockOutlets = {
      outlets: [
        { id: '1', name: 'Outlet 1' },
        { id: '2', name: 'Outlet 2' },
      ],
      totalCount: 2,
      pageIndex: 0,
      pageSize: 10,
    };

    it('should successfully get profile outlets', async () => {
      // Arrange
      mockOutletProfileService.getProfileOutlets.mockResolvedValue(mockOutlets);

      // Act
      const result = await controller.getProfileOutlets(merchantId, profileId, mockDto, mockRequest);

      // Assert
      expect(service.getProfileOutlets).toHaveBeenCalledWith(merchantId, profileId, mockDto, mockHeaders);
      expect(service.getProfileOutlets).toHaveBeenCalledTimes(1);
      expect(baseResponseHelper).toHaveBeenCalledWith(mockOutlets);
      expect(result).toEqual({
        success: true,
        data: mockOutlets,
        message: 'Operation successful',
      });
    });

    it('should handle invalid UUID format for merchantId', async () => {
      // Arrange
      const invalidMerchantId = 'invalid-uuid';
      mockOutletProfileService.getProfileOutlets.mockRejectedValue(new Error('Invalid UUID format'));

      await expect(controller.getProfileOutlets(invalidMerchantId, profileId, mockDto, mockRequest)).rejects.toThrow(
        'Invalid UUID format'
      );
    });

    it('should handle service errors when getting profile outlets', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockOutletProfileService.getProfileOutlets.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getProfileOutlets(merchantId, profileId, mockDto, mockRequest)).rejects.toThrow(
        'Database connection failed'
      );
      expect(service.getProfileOutlets).toHaveBeenCalledWith(merchantId, profileId, mockDto, mockHeaders);
    });

    it('should handle empty DTO', async () => {
      // Arrange
      const emptyDto = {} as GetOutletDto;
      mockOutletProfileService.getProfileOutlets.mockResolvedValue({ outlets: [], totalCount: 0 });

      // Act
      const result = await controller.getProfileOutlets(merchantId, profileId, emptyDto, mockRequest);

      // Assert
      expect(service.getProfileOutlets).toHaveBeenCalledWith(merchantId, profileId, emptyDto, mockHeaders);
      expect(result.data).toEqual({ outlets: [], totalCount: 0 });
    });

    it('should handle missing headers in request', async () => {
      // Arrange
      const requestWithoutHeaders = { headers: {} } as any;
      mockOutletProfileService.getProfileOutlets.mockResolvedValue(mockOutlets);

      // Act
      const result = await controller.getProfileOutlets(merchantId, profileId, mockDto, requestWithoutHeaders);

      // Assert
      expect(service.getProfileOutlets).toHaveBeenCalledWith(merchantId, profileId, mockDto, {});
      expect(result.data).toEqual(mockOutlets);
    });
  });

  describe('createOrUpdateOutletProfileMetadata', () => {
    const mockDto: CreateOutletProfileDto = {
      outletId: 'outlet-123',
      merchantId: 'merchant-123',
      name: 'Test Outlet',
      description: 'Test Description',
    } as any;
    const userId = 'user-123';
    const mockCreatedProfile = {
      id: 'profile-123',
      ...mockDto,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should successfully create outlet profile metadata with userId', async () => {
      // Arrange
      mockOutletProfileService.createOrUpdateOutletProfileMetadata.mockResolvedValue(mockCreatedProfile);

      // Act
      const result = await controller.createOrUpdateOutletProfileMetadata(mockDto, userId);

      // Assert
      expect(service.createOrUpdateOutletProfileMetadata).toHaveBeenCalledWith(mockDto, userId);
      expect(service.createOrUpdateOutletProfileMetadata).toHaveBeenCalledTimes(1);
      expect(baseResponseHelper).toHaveBeenCalledWith(mockCreatedProfile);
      expect(result).toEqual({
        success: true,
        data: mockCreatedProfile,
        message: 'Operation successful',
      });
    });

    it('should successfully create outlet profile metadata without userId', async () => {
      // Arrange
      const mockCreatedProfileWithoutUser = { ...mockCreatedProfile, createdBy: null };
      mockOutletProfileService.createOrUpdateOutletProfileMetadata.mockResolvedValue(mockCreatedProfileWithoutUser);

      // Act
      const result = await controller.createOrUpdateOutletProfileMetadata(mockDto, undefined);

      // Assert
      expect(service.createOrUpdateOutletProfileMetadata).toHaveBeenCalledWith(mockDto, undefined);
      expect(baseResponseHelper).toHaveBeenCalledWith(mockCreatedProfileWithoutUser);
    });

    it('should handle service errors when creating outlet profile metadata', async () => {
      // Arrange
      const error = new Error('Validation failed');
      mockOutletProfileService.createOrUpdateOutletProfileMetadata.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.createOrUpdateOutletProfileMetadata(mockDto, userId)).rejects.toThrow('Validation failed');
      expect(service.createOrUpdateOutletProfileMetadata).toHaveBeenCalledWith(mockDto, userId);
    });

    it('should handle empty DTO', async () => {
      // Arrange
      const emptyDto = {} as CreateOutletProfileDto;
      mockOutletProfileService.createOrUpdateOutletProfileMetadata.mockRejectedValue(new Error('Required fields missing'));

      // Act & Assert
      await expect(controller.createOrUpdateOutletProfileMetadata(emptyDto, userId)).rejects.toThrow(
        'Required fields missing'
      );
    });

    it('should handle update scenario', async () => {
      // Arrange
      const updateDto = { ...mockDto, id: 'existing-profile-id' };
      const mockUpdatedProfile = {
        ...mockCreatedProfile,
        id: 'existing-profile-id',
        updatedAt: new Date(),
      };
      mockOutletProfileService.createOrUpdateOutletProfileMetadata.mockResolvedValue(mockUpdatedProfile);

      // Act
      const result = await controller.createOrUpdateOutletProfileMetadata(updateDto, userId);

      // Assert
      expect(service.createOrUpdateOutletProfileMetadata).toHaveBeenCalledWith(updateDto, userId);
      expect(result.data).toEqual(mockUpdatedProfile);
    });
  });

  describe('updateOutletProfileStatus', () => {
    const mockStatusDto: UpdateOutletProfileStatusDto = {
      profileId: 'profile-123',
      status: OutletProfileStatusEnum.Active,
      outletId: 'outlet-123',
    };
    const mockUpdatedProfile = {
      id: 'profile-123',
      status: OutletProfileStatusEnum.Active,
      statusUpdatedAt: new Date(),
    };
    const mockReq = {
      headers: 'token',
    } as any;
    it('should successfully update outlet profile status', async () => {
      // Arrange
      mockOutletProfileService.validateAndUpdateOutletProfileStatus.mockResolvedValue(mockUpdatedProfile);

      // Act
      const result = await controller.updateOutletProfileStatus(mockStatusDto, mockReq, 'user-id');

      // Assert
      expect(service.validateAndUpdateOutletProfileStatus).toHaveBeenCalledWith(mockStatusDto, 'token', 'user-id');
      expect(service.validateAndUpdateOutletProfileStatus).toHaveBeenCalledTimes(1);
      expect(baseResponseHelper).toHaveBeenCalledWith(mockUpdatedProfile);
      expect(result).toEqual({
        success: true,
        data: mockUpdatedProfile,
        message: 'Operation successful',
      });
    });

    it('should handle service errors when updating outlet profile status', async () => {
      // Arrange
      const error = new Error('Profile not found');
      mockOutletProfileService.validateAndUpdateOutletProfileStatus.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.updateOutletProfileStatus(mockStatusDto, mockReq, 'user-id')).rejects.toThrow(
        'Profile not found'
      );
      expect(service.validateAndUpdateOutletProfileStatus).toHaveBeenCalledWith(mockStatusDto, 'token', 'user-id');
    });

    it('should handle invalid status values', async () => {
      // Arrange
      const invalidStatusDto = { ...mockStatusDto, status: OutletProfileStatusEnum.Pending };
      mockOutletProfileService.validateAndUpdateOutletProfileStatus.mockRejectedValue(new Error('Invalid status value'));

      // Act & Assert
      await expect(controller.updateOutletProfileStatus(invalidStatusDto, 'token' as any, 'user-id')).rejects.toThrow(
        'Invalid status value'
      );
    });

    it('should handle missing profileId', async () => {
      // Arrange
      const invalidDto = { status: OutletProfileStatusEnum.Pending } as UpdateOutletProfileStatusDto;
      mockOutletProfileService.validateAndUpdateOutletProfileStatus.mockRejectedValue(new Error('Profile ID is required'));

      // Act & Assert
      await expect(controller.updateOutletProfileStatus(invalidDto, 'token' as any, 'user-id')).rejects.toThrow(
        'Profile ID is required'
      );
    });

    it('should handle status update without reason', async () => {
      // Arrange
      const statusDtoWithoutReason = {
        profileId: 'profile-123',
        outletId: 'outletId',
        status: OutletProfileStatusEnum.Pending,
      };
      const mockUpdatedProfileWithoutReason = {
        id: 'profile-123',
        status: 'active',
        statusUpdatedAt: new Date(),
      };
      mockOutletProfileService.validateAndUpdateOutletProfileStatus.mockResolvedValue(mockUpdatedProfileWithoutReason);

      // Act
      const result = await controller.updateOutletProfileStatus(statusDtoWithoutReason, mockReq, 'user-id');

      // Assert
      expect(service.validateAndUpdateOutletProfileStatus).toHaveBeenCalledWith(statusDtoWithoutReason, 'token', 'user-id');
      expect(result.data).toEqual(mockUpdatedProfileWithoutReason);
    });
  });

  describe('Controller initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have outlet profile service injected', () => {
      expect(service).toBeDefined();
    });
  });

  describe('Error handling scenarios', () => {
    const outletId = 'outletId';
    const profileId = 'profileId';
    it('should handle network timeout errors', async () => {
      // Arrange
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      mockOutletProfileService.getOutletProfileMetadata.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(controller.getOutletProfileMetadata(outletId, profileId, 'token' as any)).rejects.toThrow(
        'Request timeout'
      );
    });

    it('should handle database connection errors', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      dbError.name = 'DatabaseError';
      mockOutletProfileService.getProfileOutlets.mockRejectedValue(dbError);

      const merchantId = '123e4567-e89b-12d3-a456-426614174000';
      const dto = { pageIndex: 0, pageSize: 10 } as any;
      const req = { headers: {} } as any;

      // Act & Assert
      await expect(controller.getProfileOutlets(merchantId, profileId, dto, req)).rejects.toThrow(
        'Database connection failed'
      );
    });
  });
  it('should call getOutletDetailsMetadata with correct params and return baseResponseHelper result', async () => {
    const outletId = 'outlet123';
    const profileId = 'profile456';
    const serviceResponse = { some: 'data' };
    const expectedResponse = { status: 'ok', data: serviceResponse };

    mockOutletProfileService.getOutletDetailsMetadata.mockResolvedValue(serviceResponse);
    (baseResponseHelper as jest.Mock).mockReturnValue(expectedResponse);

    const result = await controller.getOutletDetailsMetadata(outletId, profileId);

    expect(service.getOutletDetailsMetadata).toHaveBeenCalledWith(outletId, profileId);
    expect(baseResponseHelper).toHaveBeenCalledWith(serviceResponse);
    expect(result).toEqual(expectedResponse);
  });

  it('should throw if service throws', async () => {
    const outletId = 'outlet123';
    const profileId = 'profile456';

    mockOutletProfileService.getOutletDetailsMetadata.mockRejectedValue(new Error('Service error'));

    await expect(controller.getOutletDetailsMetadata(outletId, profileId)).rejects.toThrow('Service error');
  });
  describe('resetOutletProfileDetails', () => {
    const dto = {
      profileId: 'profile-1',
      outletId: 'outlet-1',
      id: 'id-1',
      merchantId: 'merchant-1',
    };
    const userId = 'user-123';
    const headers = { authorization: 'Bearer token' };
    const req = { headers } as any;

    it('should call service with correct parameters and return response', async () => {
      const serviceResponse = { success: true };
      const wrappedResponse = { data: serviceResponse };

      mockOutletProfileService.resetOutletProfileDetails.mockResolvedValue(serviceResponse);
      (baseResponseHelper as jest.Mock).mockReturnValue(wrappedResponse);

      const result = await controller.resetOutletProfileDetails(dto, userId, req);

      expect(mockOutletProfileService.resetOutletProfileDetails).toHaveBeenCalledWith(dto, userId, headers);
      expect(baseResponseHelper).toHaveBeenCalledWith(serviceResponse);
      expect(result).toEqual(wrappedResponse);
    });

    it('should throw if service throws an exception', async () => {
      const error = new HttpException('Reset failed', HttpStatus.BAD_REQUEST);
      mockOutletProfileService.resetOutletProfileDetails.mockRejectedValue(error);

      await expect(controller.resetOutletProfileDetails(dto, userId, req)).rejects.toThrow(HttpException);
    });

    it('should handle missing headers gracefully', async () => {
      const reqWithoutHeaders = {} as any;
      const serviceResponse = { success: true };
      mockOutletProfileService.resetOutletProfileDetails.mockResolvedValue(serviceResponse);
      (baseResponseHelper as jest.Mock).mockReturnValue({ data: serviceResponse });

      const result = await controller.resetOutletProfileDetails(dto, userId, reqWithoutHeaders);
      expect(mockOutletProfileService.resetOutletProfileDetails).toHaveBeenCalledWith(dto, userId, undefined);
      expect(result).toEqual({ data: serviceResponse });
    });
  });

  describe('getOutletStatusByProfileId', () => {
    it('should return the outlet status wrapped in baseResponseHelper', async () => {
      const outletId = 'outlet-123';
      const profileId = 'profile-456';
      const mockResult = true;
      const mockResponse = { success: true, data: mockResult };

      mockOutletProfileService.getOutletStatusByProfileId.mockResolvedValue(mockResult);
      (baseResponseHelper as jest.Mock).mockReturnValue(mockResponse);

      const result = await controller.getOutletStatusByProfileId(outletId, profileId);

      expect(service.getOutletStatusByProfileId).toHaveBeenCalledWith(outletId, profileId);
      expect(baseResponseHelper).toHaveBeenCalledWith(mockResult);
      expect(result).toEqual(mockResponse);
    });

    it('should throw an error if service throws', async () => {
      const outletId = 'outlet-999';
      const profileId = 'profile-999';
      const error = new Error('Service failure');

      mockOutletProfileService.getOutletStatusByProfileId.mockRejectedValue(error);

      await expect(controller.getOutletStatusByProfileId(outletId, profileId)).rejects.toThrow('Service failure');
      expect(service.getOutletStatusByProfileId).toHaveBeenCalledWith(outletId, profileId);
    });
  });
});
