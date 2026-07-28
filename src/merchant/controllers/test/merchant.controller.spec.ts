jest.mock('src/helpers/base-response.helper', () => ({
  baseResponseHelper: jest.fn(),
}));
import { Test, TestingModule } from '@nestjs/testing';

import { AuthHeaderService } from 'src/auth/services/auth.validator.service';
import { baseResponseHelper } from 'src/helpers/base-response.helper';
import { MerchantReadController } from '../merchant-read.controller';
import { MerchantWriteController } from '../merchant-write.controller';
import { MerchantService } from 'src/merchant/services/merchant.service';
import { MerchantPhotoService } from 'src/merchant/services/merchant-photo.service';
import { GroupMerchantService } from 'src/merchant/shared/group-merchant.service';
import { Merchant } from 'src/merchant/entities/merchant.model';
import { SortDto } from 'src/common/dtos/sort.dto';
import { PaginationDto } from 'src/common/dtos/pagenation.dto';
import { GetAllMerchantsDto } from 'src/merchant/dtos/get-all-merchants.dto';
import { MerchantStatusEnum } from 'src/merchant/enums/merchant-status.enum';
import { ProductEnum } from 'src/merchant/enums/merchant-listing-page.enum';

const mockMerchantService = {
  getSalesOwners: jest.fn(),
  getAllMerchants: jest.fn(),
  getMerchant: jest.fn(),
  createMerchantWithUserFromCRM: jest.fn(),
  updateMerchant: jest.fn(),
  getMerchantById: jest.fn(),
  getMerchantDetailsById: jest.fn(),
  updateMerchantOutletsNumber: jest.fn(),
  updateMerchantPaymentType: jest.fn(),
  getGroupIdsByMerchantIds: jest.fn(),
  getMerchantNames: jest.fn(),
  updateMerchantStatus: jest.fn(),
  updateMerchantFastPaymentStatus: jest.fn(),
  updateMerchantStatusById: jest.fn(),
  getMerchantDataById: jest.fn(),
  getOutletLinksByUserId: jest.fn(),
};
const mockMerchantPhotoService = {
  deleteMerchantPhotoById: jest.fn(),
  getMerchantPhotos: jest.fn(),
};

const mockAuthHeaderService = {
  getUserId: jest.fn(),
};
const mockGroupMerchantService = {
  getAllMerchants: jest.fn(),
};

describe('MerchantReadController', () => {
  let controller: MerchantReadController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MerchantReadController],
      providers: [
        { provide: MerchantService, useValue: mockMerchantService },
        { provide: AuthHeaderService, useValue: mockAuthHeaderService },
        { provide: MerchantPhotoService, useValue: mockMerchantPhotoService },
        { provide: GroupMerchantService, useValue: mockGroupMerchantService },
      ],
    }).compile();

    controller = module.get<MerchantReadController>(MerchantReadController);
  });

  it('should get sales owners', async () => {
    mockMerchantService.getSalesOwners.mockResolvedValue('salesOwners');
    const result = await controller.getSalesOwners(1, 10, 'IN');
    expect(result).toEqual(baseResponseHelper('salesOwners'));
  });

  it('should get all merchants', async () => {
    const response = { data: [], pagination: { page: 1, limit: 10, total: 0 } };
    mockMerchantService.getAllMerchants.mockResolvedValue(response);
    const result = await controller.getAllMerchants(undefined, undefined);
    expect(result).toEqual(response);
  });

  it('should get merchant by ID', async () => {
    mockMerchantService.getMerchant.mockResolvedValue('merchant');
    const result = await controller.getMerchant('uuid');
    expect(result).toEqual(baseResponseHelper('merchant'));
  });

  it('should get merchant categories', async () => {
    mockMerchantService.getMerchantById.mockResolvedValue('merchantWithCategories');
    const result = await controller.getMerchantCategories('uuid');
    expect(result).toEqual(baseResponseHelper('merchantWithCategories'));
  });

  it('should get merchant details', async () => {
    mockMerchantService.getMerchantDetailsById.mockResolvedValue('merchantDetails');
    const result = await controller.getMerchantDetails('uuid');
    expect(result).toEqual(baseResponseHelper('merchantDetails'));
  });

  it('should get group by merchant IDs', async () => {
    mockMerchantService.getGroupIdsByMerchantIds.mockResolvedValue(['group1', 'group2']);
    const result = await controller.getGroupByMerchantIds(['uuid1', 'uuid2']);
    expect(result).toEqual(baseResponseHelper(['group1', 'group2']));
  });

  it('should get merchant name', async () => {
    mockMerchantService.getMerchantNames.mockResolvedValue('merchantName');
    const result = await controller.getMerchantNames({ merchantIds: ['test'] });
    expect(result).toEqual(baseResponseHelper('merchantName'));
  });

  it('should get merchant data by id', async () => {
    const id = 'uuid-id';
    const serviceResponse = { id, name: 'Test Merchant' };
    mockMerchantService.getMerchantDataById.mockResolvedValue(serviceResponse);
    (baseResponseHelper as jest.Mock).mockReturnValue(serviceResponse);
    const result = await controller.getMerchantDataById(id);
    expect(mockMerchantService.getMerchantDataById).toHaveBeenCalledWith(id);
    expect(baseResponseHelper).toHaveBeenCalledWith(serviceResponse);
    expect(result).toBe(serviceResponse);
  });

  it('should return merchant photos wrapped in baseResponseHelper', async () => {
    const mockMerchantPhotos = [
      { id: 'photo-1', merchantProfileMetadataId: 'merchant-1', cdnUrl: 'https://cdn.example.com/photo1.jpg' },
      { id: 'photo-2', merchantProfileMetadataId: 'merchant-1', cdnUrl: 'https://cdn.example.com/photo2.jpg' },
    ];
    const merchantId = '8a5f2f4b-7e9c-4a0a-bd6a-efc7f395b7fa';
    mockMerchantPhotoService.getMerchantPhotos.mockResolvedValue(mockMerchantPhotos);
    (baseResponseHelper as jest.Mock).mockImplementation((data: unknown) => data);
    const result = await controller.getMerchantPhotos(merchantId);
    expect(mockMerchantPhotoService.getMerchantPhotos).toHaveBeenCalledWith(merchantId);
    expect(baseResponseHelper).toHaveBeenCalledWith(mockMerchantPhotos);
    expect(result).toEqual(mockMerchantPhotos);
  });

  it('should return merchants with pagination', async () => {
    const mockMerchantData: Merchant[] = [
      { id: '1', name: 'Merchant A' } as Merchant,
      { id: '2', name: 'Merchant B' } as Merchant,
    ];
    const mockPagination = { page: 1, limit: 10, totalCount: 2 };
    const user = { id: 'user123' };
    const sortDto: SortDto = { sort: ['name,asc'] };
    const paginationDto: PaginationDto = { page: 1, limit: 10 };
    const filterDto: GetAllMerchantsDto = {
      merchantStatus: MerchantStatusEnum.ACTIVE,
      salesOwners: ['sales1'],
      categoriesIds: ['cat1'],
      search: 'test',
      country: 'AE',
      product: [ProductEnum.CIRCLE],
    };
    const expectedResult = { data: mockMerchantData, pagination: mockPagination };
    mockGroupMerchantService.getAllMerchants.mockResolvedValue(expectedResult);
    const result = await controller.getMerchantUserMerchant(user, filterDto, sortDto, paginationDto);
    expect(mockGroupMerchantService.getAllMerchants).toHaveBeenCalledWith(filterDto, sortDto, paginationDto, null, user);
    expect(result).toEqual(expectedResult);
  });

  it('should get outlet links by merchant id', async () => {
    mockAuthHeaderService.getUserId.mockResolvedValue('userId');
    mockMerchantService.getOutletLinksByUserId.mockResolvedValue({ linkedOutlets: [] });
    (baseResponseHelper as jest.Mock).mockImplementation((data: unknown) => data);
    await controller.getOutletLinksByMerchantId({ authorization: 'Bearer token' });
    expect(mockAuthHeaderService.getUserId).toHaveBeenCalledWith('Bearer token');
    expect(mockMerchantService.getOutletLinksByUserId).toHaveBeenCalledWith('userId');
  });
});

describe('MerchantWriteController', () => {
  let controller: MerchantWriteController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MerchantWriteController],
      providers: [
        { provide: MerchantService, useValue: mockMerchantService },
        { provide: AuthHeaderService, useValue: mockAuthHeaderService },
        { provide: MerchantPhotoService, useValue: mockMerchantPhotoService },
      ],
    }).compile();

    controller = module.get<MerchantWriteController>(MerchantWriteController);
  });

  it('should create merchant from CRM', async () => {
    await controller.createMerchantWithUserFromCRM({} as never);
    expect(mockMerchantService.createMerchantWithUserFromCRM).toHaveBeenCalled();
  });

  it('should update merchant', async () => {
    mockMerchantService.updateMerchant.mockResolvedValue('updatedMerchant');
    const result = await controller.updateMerchant({} as never, {}, 'uuid', 'userId');
    expect(result).toEqual(baseResponseHelper('updatedMerchant'));
  });

  it('should update merchant outlets number', async () => {
    mockMerchantService.updateMerchantOutletsNumber.mockResolvedValue('outletsUpdated');
    const result = await controller.updateMerchantOutletsNumber('uuid', {} as never);
    expect(result).toEqual('outletsUpdated');
  });

  it('should update merchant payment type', async () => {
    mockAuthHeaderService.getUserId.mockResolvedValue('userId');
    mockMerchantService.updateMerchantPaymentType.mockResolvedValue('paymentUpdated');
    const result = await controller.updateMerchantPaymentType('uuid', { paymentPlan: 'PLAN_A' } as never, {
      authorization: '<mock-auth>',
    });
    expect(result).toEqual(baseResponseHelper('paymentUpdated'));
  });

  it('should update merchant status', async () => {
    const id = 'uuid-id';
    const status = true;
    const token = '<mock-auth>';
    const userId = 'user-id';
    const serviceResponse = { success: true };
    mockMerchantService.updateMerchantStatus.mockResolvedValue(serviceResponse);
    (baseResponseHelper as jest.Mock).mockReturnValue(serviceResponse);
    const result = await controller.updateMerchantStatus(id, status, token, userId);
    expect(mockMerchantService.updateMerchantStatus).toHaveBeenCalledWith(id, status, token, 'user-id');
    expect(baseResponseHelper).toHaveBeenCalledWith(serviceResponse);
    expect(result).toBe(serviceResponse);
  });

  it('should update fast payment status', async () => {
    const id = 'uuid-id';
    const status = false;
    const headers = { Authorization: '<mock-auth>' };
    const userId = 'user-id';
    const serviceResponse = { success: true };
    mockMerchantService.updateMerchantFastPaymentStatus.mockResolvedValue(serviceResponse);
    (baseResponseHelper as jest.Mock).mockReturnValue(serviceResponse);
    const result = await controller.updateMerchantFastPaymentStatus(id, status, headers, userId);
    expect(mockMerchantService.updateMerchantFastPaymentStatus).toHaveBeenCalledWith(id, status, headers, 'user-id');
    expect(baseResponseHelper).toHaveBeenCalledWith(serviceResponse);
    expect(result).toBe(serviceResponse);
  });

  it('should update merchant status by id using DTO', async () => {
    const dto = { merchantId: 'uuid-id', status: true };
    const serviceResponse = { success: true };
    mockMerchantService.updateMerchantStatusById.mockResolvedValue(serviceResponse);
    (baseResponseHelper as jest.Mock).mockReturnValue(serviceResponse);
    const result = await controller.updateMerchantStatusById(dto as never);
    expect(mockMerchantService.updateMerchantStatusById).toHaveBeenCalledWith(dto);
    expect(baseResponseHelper).toHaveBeenCalledWith(serviceResponse);
    expect(result).toBe(serviceResponse);
  });

  it('should call deleteMerchantPhotoById and return wrapped response', async () => {
    const photoId = 'e5c1d36e-d7b2-4f67-b6f9-109843e04512';
    const serviceResponse = { success: true, deletedId: photoId };
    mockMerchantPhotoService.deleteMerchantPhotoById.mockResolvedValue(serviceResponse);
    (baseResponseHelper as jest.Mock).mockImplementation((data: unknown) => data);
    const result = await controller.DeleteMerchantPhotoById(photoId);
    expect(mockMerchantPhotoService.deleteMerchantPhotoById).toHaveBeenCalledWith(photoId);
    expect(baseResponseHelper).toHaveBeenCalledWith(serviceResponse);
    expect(result).toEqual(serviceResponse);
  });
});
