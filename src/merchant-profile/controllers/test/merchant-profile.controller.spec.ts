import { TestingModule, Test } from '@nestjs/testing';
import { baseResponseHelper } from 'src/helpers/base-response.helper';
import { MerchantProfileMetadataDto } from 'src/merchant-profile/dtos/create-merchant-profile-data.dto';
import { UpdateMerchantProfileStatusDto } from 'src/merchant-profile/dtos/update-merchant-profile-status.dto';
import { MerchantProfileService } from 'src/merchant-profile/services/merchant-profile.service';
import { MerchantProfileController } from '../merchant-profile.controller';
import { MerchantProfileStatusEnum } from 'src/merchant-profile/enums/merchant-profile-status-enum';
import { OutletProfileService } from 'src/outlet-profile/services/outlet-profile.service';
import { HttpException } from '@nestjs/common';

jest.mock('src/helpers/base-response.helper', () => ({
  baseResponseHelper: jest.fn(),
}));
describe('MerchantProfileController', () => {
  let controller: MerchantProfileController;
  let service: MerchantProfileService;
  let outletProfileService: OutletProfileService;
  const mockReq = {
    headers: 'token',
  };
  const mockService = {
    getMerchantProfileMetaData: jest.fn(),
    createOrUpdateMerchantProfileData: jest.fn(),
    updateMerchantProfileMetaDataStatus: jest.fn(),
    addMerchantProfilePhoto: jest.fn(),
    deleteMerchantProfilePhotoById: jest.fn(),
    getMerchantProfilePhotos: jest.fn(),
    getMerchantDetails: jest.fn(),
    getMerchants: jest.fn(),
    updateShariahStatus: jest.fn(),
    getMerchantStatusByProfileId: jest.fn(),
  };
  const mockOutletProfileService = {
    getMerchantProfileOutlets: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MerchantProfileController],
      providers: [
        {
          provide: MerchantProfileService,
          useValue: mockService,
        },
        {
          provide: OutletProfileService,
          useValue: mockOutletProfileService,
        },
      ],
    }).compile();

    controller = module.get<MerchantProfileController>(MerchantProfileController);
    service = module.get<MerchantProfileService>(MerchantProfileService);
    outletProfileService = module.get<OutletProfileService>(OutletProfileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMerchantProfileMetaData', () => {
    it('should return merchant profile metadata', async () => {
      const mockRes = { name: 'Test Profile' };
      mockService.getMerchantProfileMetaData.mockResolvedValue(mockRes);

      const result = await controller.getMerchantProfileMetaData('merchant-1', 'profile-1');
      expect(service.getMerchantProfileMetaData).toHaveBeenCalledWith('merchant-1', 'profile-1');
      expect(result).toEqual(baseResponseHelper(mockRes));
    });

    it('should throw error if service fails', async () => {
      mockService.getMerchantProfileMetaData.mockRejectedValue(new Error('DB Error'));

      await expect(controller.getMerchantProfileMetaData('m1', 'p1')).rejects.toThrow('DB Error');
    });
  });

  describe('createOrUpdateMerchantProfileData', () => {
    const dto: MerchantProfileMetadataDto = {
      merchantId: 'merchant-1',
      profileId: 'profile-1',
      name: 'New Name',
      nameAr: 'اسم',
      maxOfferValue: 100,
      status: MerchantProfileStatusEnum.ACTIVE,
      desc: 'desc',
      descAr: 'descAr',
      imageUrl: 'http://example.com/image.jpg',
    } as any;

    it('should create or update merchant profile data', async () => {
      const mockRes = { success: true };
      mockService.createOrUpdateMerchantProfileData.mockResolvedValue(mockRes);

      const user = { id: 'user-123' };
      const result = await controller.createOrUpdateMerchantProfileData(dto, user.id);

      expect(service.createOrUpdateMerchantProfileData).toHaveBeenCalledWith(dto, 'user-123');
      expect(result).toEqual(baseResponseHelper(mockRes));
    });

    it('should throw error if service fails', async () => {
      mockService.createOrUpdateMerchantProfileData.mockRejectedValue(new Error('Creation error'));

      await expect(controller.createOrUpdateMerchantProfileData(dto, 'user-123')).rejects.toThrow('Creation error');
    });
  });

  describe('updateMerchantProfileMetaDataStatus', () => {
    const dto: UpdateMerchantProfileStatusDto = { status: MerchantProfileStatusEnum.ACTIVE };

    it('should update status of merchant profile metadata', async () => {
      const mockRes = { updated: true };
      mockService.updateMerchantProfileMetaDataStatus.mockResolvedValue(mockRes);

      const result = await controller.updateMerchantProfileMetaDataStatus('merchant-1', 'profile-1', dto, 'user-123');

      expect(service.updateMerchantProfileMetaDataStatus).toHaveBeenCalledWith(
        'merchant-1',
        'profile-1',
        dto.status,
        'user-123'
      );
      expect(result).toEqual(baseResponseHelper(mockRes));
    });

    it('should throw error if update fails', async () => {
      mockService.updateMerchantProfileMetaDataStatus.mockRejectedValue(new Error('Update error'));

      await expect(
        controller.updateMerchantProfileMetaDataStatus('merchant-1', 'profile-1', dto, 'user-123')
      ).rejects.toThrow('Update error');
    });
  });

  describe('deleteMerchantProfilePhotoById', () => {
    it('should delete a merchant profile photo by ID', async () => {
      const photoId = 'photo-123';
      const mockRes = { deleted: true };
      mockService.deleteMerchantProfilePhotoById.mockResolvedValue(mockRes);

      const result = await controller.deleteMerchantProfilePhotoById(photoId);

      expect(service.deleteMerchantProfilePhotoById).toHaveBeenCalledWith(photoId);
      expect(result).toEqual(baseResponseHelper(mockRes));
    });

    it('should throw error if delete fails', async () => {
      mockService.deleteMerchantProfilePhotoById.mockRejectedValue(new Error('Delete failed'));

      await expect(controller.deleteMerchantProfilePhotoById('photo-123')).rejects.toThrow('Delete failed');
    });
  });
  describe('getMerchantProfileOutlets', () => {
    it('should return merchant profile outlets', async () => {
      const mockResponse = [
        {
          id: 1,
          merchantName: 'Test Merchant',
          status: 'active',
          maxOffer: 20,
          Outlet: {
            id: 'outlet-1',
            merchantName: 'Outlet Merchant',
            rating: 4.5,
            status: 'active',
            maxOffer: 25,
            OutletAddress: {
              location: 'Location A',
            },
          },
          OutletProfilePhotos: {
            cdnUrl: 'https://cdn.example.com/photo.jpg',
          },
        },
      ];
      mockOutletProfileService.getMerchantProfileOutlets.mockResolvedValue(mockResponse);

      const result = await controller.getMerchantProfileOutlets('merchant-1', 'profile-1', mockReq as any);
      expect(outletProfileService.getMerchantProfileOutlets).toHaveBeenCalledWith('merchant-1', 'profile-1', 'token');
      expect(result).toEqual(baseResponseHelper(mockResponse));
    });

    it('should throw error if service fails', async () => {
      mockOutletProfileService.getMerchantProfileOutlets.mockRejectedValue(new Error('DB Error'));
      await expect(controller.getMerchantProfileOutlets('m1', 'p1', mockReq as any)).rejects.toThrow('DB Error');
    });
  });
  describe('getMerchantProfilePhotos', () => {
    it('should return merchant profile photos', async () => {
      const result = [{ photoUrl: 'https://cdn.com/photo.jpg' }];
      mockService.getMerchantProfilePhotos.mockResolvedValue(result);
      (baseResponseHelper as jest.Mock).mockReturnValue({ data: result });
      const res = await controller.getMerchantProfilePhotos('profile-123');
      expect(service.getMerchantProfilePhotos).toHaveBeenCalledWith('profile-123');
      expect(res).toEqual({ data: result });
    });

    it('should throw error if service fails', async () => {
      mockService.getMerchantProfilePhotos.mockRejectedValue(new HttpException('Error', 500));
      await expect(controller.getMerchantProfilePhotos('profile-123')).rejects.toThrow(HttpException);
    });
  });

  describe('getMerchantProfileData', () => {
    it('should return merchant profile details', async () => {
      const result = { name: 'Merchant A' };
      const coordinate = { lat: 12.34, long: 56.78 };
      mockService.getMerchantDetails.mockResolvedValue(result);
      (baseResponseHelper as jest.Mock).mockReturnValue({ data: result });

      const res = await controller.getMerchantProfileData('merchant-1', 'profile-1', coordinate);
      expect(service.getMerchantDetails).toHaveBeenCalledWith('merchant-1', 'profile-1', coordinate);
      expect(res).toEqual({ data: result });
    });

    it('should throw error if service fails', async () => {
      mockService.getMerchantDetails.mockRejectedValue(new HttpException('Failed', 400));
      await expect(controller.getMerchantProfileData('merchant-1', 'profile-1', { lat: 0, lng: 0 })).rejects.toThrow(
        HttpException
      );
    });
  });

  describe('getMerchantsProfileData', () => {
    it('should return merchants profile list', async () => {
      const merchantFilters = { city: 'Bangalore', category: 'Food' };
      const result = [{ name: 'Merchant 1' }];
      mockService.getMerchants.mockResolvedValue(result);
      (baseResponseHelper as jest.Mock).mockReturnValue({ data: result });

      const res = await controller.getMerchantsProfileData('profile-abc', merchantFilters as any);
      expect(service.getMerchants).toHaveBeenCalledWith('profile-abc', merchantFilters);
      expect(res).toEqual({ data: result });
    });

    it('should throw error if service fails', async () => {
      mockService.getMerchants.mockRejectedValue(new HttpException('Bad Request', 400));
      await expect(controller.getMerchantsProfileData('profile-abc', {} as any)).rejects.toThrow(HttpException);
    });
  });

  describe('getMerchantStatusByProfileId', () => {
    it('should return merchant status wrapped by baseResponseHelper', async () => {
      const merchantId = 'merchant-123';
      const profileId = 'profile-123';
      const mockResponse = true;

      mockService.getMerchantStatusByProfileId.mockResolvedValue(mockResponse);

      const result = await controller.getMerchantStatusByProfileId(merchantId, profileId);

      expect(service.getMerchantStatusByProfileId).toHaveBeenCalledWith(merchantId, profileId);
      expect(baseResponseHelper).toHaveBeenCalledWith(mockResponse);
      expect(result).toEqual(baseResponseHelper(mockResponse));
    });

    it('should throw an error if service throws', async () => {
      const merchantId = 'merchant-999';
      const profileId = 'profile-999';
      const error = new Error('Merchant not found');
      mockService.getMerchantStatusByProfileId.mockRejectedValue(error);

      await expect(controller.getMerchantStatusByProfileId(merchantId, profileId)).rejects.toThrow('Merchant not found');
      expect(service.getMerchantStatusByProfileId).toHaveBeenCalledWith(merchantId, profileId);
    });
  });
});
