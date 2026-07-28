import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { Merchant } from 'src/merchant/entities/merchant.model';
import { ProductEnum } from 'src/merchant/enums/merchant-listing-page.enum';
import { GroupMerchantService } from '../group-merchant.service';
import { MerchantStatusEnum } from 'src/merchant/enums/merchant-status.enum';
import { Op } from 'sequelize';
import { HttpException, HttpStatus } from '@nestjs/common';
import { GenericHttpService } from 'src/http/generic-http.service';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

const mockMerchantModel = {
  count: jest.fn(),
  findAll: jest.fn(),
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
};

const mockHttpService = {
  get: jest.fn(),
  post: jest.fn(),
};

describe('GroupMerchantService', () => {
  let service: GroupMerchantService;
  const mockSort = { sort: ['createdAt,desc'] };
  const mockPagination = { page: 1, limit: 10 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupMerchantService,
        {
          provide: getModelToken(Merchant),
          useValue: mockMerchantModel,
        },
        {
          provide: CustomPinoLogger,
          useValue: mockLogger,
        },
        {
          provide: GenericHttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<GroupMerchantService>(GroupMerchantService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockMerchants = [
    {
      id: '1',
      toJSON: jest.fn().mockReturnValue({ id: '1', name: 'Merchant 1' }),
    },
    {
      id: '2',
      toJSON: jest.fn().mockReturnValue({ id: '2', name: 'Merchant 2' }),
    },
  ];

  const mockMerchantAdmins = [
    {
      id: 'admin1',
      name: 'Admin 1',
      merchantUserLinks: [{ merchantId: '1', merchantUserId: 'admin1' }],
    },
    {
      id: 'admin2',
      name: 'Admin 2',
      merchantUserLinks: [{ merchantId: '2', merchantUserId: 'admin2' }],
    },
  ];

  it('should return all merchants with pagination and merchant admin details', async () => {
    mockMerchantModel.count.mockResolvedValue(2);
    mockMerchantModel.findAll
      .mockResolvedValueOnce(mockMerchants.map(m => ({ id: m.id, name: 'Test', active_outlets_num: 2 })))
      .mockResolvedValueOnce(mockMerchants);

    mockHttpService.post.mockResolvedValue({
      data: {
        data: mockMerchantAdmins,
      },
    });

    const result = await service.getAllMerchants(
      {
        salesOwners: [],
        categoriesIds: [],
        merchantStatus: null,
        search: '',
        country: '',
        product: [],
      },
      mockSort,
      mockPagination,
      'groupId123',
      {}
    );

    expect(mockMerchantModel.count).toHaveBeenCalled();
    expect(mockMerchantModel.findAll).toHaveBeenCalledTimes(2);
    expect(mockHttpService.post).toHaveBeenCalledWith(`${process.env.MERCHANT_IDENTITY_URL}/users/merchant-users`, {
      merchantIds: ['1', '2'],
    });
    expect(result.data.length).toBe(2);
    expect(result.data[0].merchantAdmin).toEqual([
      expect.objectContaining({
        id: 'admin1',
        name: 'Admin 1',
        merchantUserLinks: { merchantId: '1', merchantUserId: 'admin1' },
      }),
    ]);
    expect(result.data[1].merchantAdmin).toEqual([
      expect.objectContaining({
        id: 'admin2',
        name: 'Admin 2',
        merchantUserLinks: {
          merchantId: '2',
          merchantUserId: 'admin2',
        },
      }),
    ]);
    expect(result.pagination.count).toBe(2);
  });

  it('should handle merchant admin API failure gracefully', async () => {
    mockMerchantModel.count.mockResolvedValue(2);
    mockMerchantModel.findAll
      .mockResolvedValueOnce(mockMerchants.map(m => ({ id: m.id, name: 'Test', active_outlets_num: 2 })))
      .mockResolvedValueOnce(mockMerchants);

    mockHttpService.post.mockRejectedValue(new Error('API Error'));

    const result = await service.getAllMerchants(
      {
        salesOwners: [],
        categoriesIds: [],
        merchantStatus: null,
        search: '',
        country: '',
        product: [],
      },
      mockSort,
      mockPagination,
      'groupId123',
      {}
    );

    expect(mockLogger.error).toHaveBeenCalledWith('GroupMerchantService.getMerchantAdminDetails failed', {
      error: expect.any(Error),
    });
    expect(result.data.length).toBe(2);
    expect(result.data[0].merchantAdmin).toEqual([]);
    expect(result.data[1].merchantAdmin).toEqual([]);
  });

  it('should apply filters: salesOwners, country, groupId', async () => {
    mockMerchantModel.count.mockResolvedValue(1);
    mockMerchantModel.findAll.mockResolvedValueOnce([{ id: '1' }]).mockResolvedValueOnce([mockMerchants[0]]);

    mockHttpService.post.mockResolvedValue({
      data: { data: [] },
    });

    await service.getAllMerchants(
      {
        salesOwners: ['owner1'],
        categoriesIds: [],
        merchantStatus: null,
        search: '',
        country: 'India',
        product: [],
      },
      mockSort,
      mockPagination,
      'groupId123',
      {}
    );

    expect(mockMerchantModel.count).toHaveBeenCalled();
    expect(mockHttpService.post).toHaveBeenCalled();
  });

  it('should apply product and merchantStatus filter logic for CIRCLE', async () => {
    mockMerchantModel.count.mockResolvedValue(1);
    mockMerchantModel.findAll.mockResolvedValueOnce([{ id: '1' }]).mockResolvedValueOnce([mockMerchants[0]]);

    mockHttpService.post.mockResolvedValue({
      data: { data: [] },
    });

    await service.getAllMerchants(
      {
        salesOwners: [],
        categoriesIds: [],
        merchantStatus: MerchantStatusEnum.ACTIVE,
        search: '',
        country: '',
        product: [ProductEnum.CIRCLE],
      },
      mockSort,
      mockPagination,
      'groupId123',
      {}
    );

    expect(mockMerchantModel.count).toHaveBeenCalled();
    expect(mockHttpService.post).toHaveBeenCalled();
  });

  it('should apply isCircle false logic when product is CLO', async () => {
    mockMerchantModel.count.mockResolvedValue(1);
    mockMerchantModel.findAll.mockResolvedValueOnce([{ id: '1' }]).mockResolvedValueOnce([mockMerchants[0]]);

    mockHttpService.post.mockResolvedValue({
      data: { data: [] },
    });

    await service.getAllMerchants(
      {
        salesOwners: [],
        categoriesIds: [],
        merchantStatus: null,
        search: '',
        country: '',
        product: [ProductEnum.CLO],
      },
      mockSort,
      mockPagination,
      'groupId123',
      {}
    );

    expect(mockMerchantModel.count).toHaveBeenCalled();
    expect(mockHttpService.post).toHaveBeenCalled();
  });

  it('should apply merchantStatus logic when product is CLO', async () => {
    mockMerchantModel.count.mockResolvedValue(1);
    mockMerchantModel.findAll.mockResolvedValueOnce([{ id: '1' }]).mockResolvedValueOnce([mockMerchants[0]]);

    mockHttpService.post.mockResolvedValue({
      data: { data: [] },
    });

    await service.getAllMerchants(
      {
        salesOwners: [],
        categoriesIds: [],
        merchantStatus: MerchantStatusEnum.DISABLED,
        search: '',
        country: '',
        product: [ProductEnum.CLO],
      },
      mockSort,
      mockPagination,
      'groupId123',
      {}
    );

    expect(mockMerchantModel.count).toHaveBeenCalled();
    expect(mockHttpService.post).toHaveBeenCalled();
  });

  it('should apply search across name, sales_person and category', async () => {
    mockMerchantModel.count.mockResolvedValue(1);
    mockMerchantModel.findAll.mockResolvedValueOnce([{ id: '1' }]).mockResolvedValueOnce([mockMerchants[0]]);

    mockHttpService.post.mockResolvedValue({
      data: { data: [] },
    });

    await service.getAllMerchants(
      {
        salesOwners: [],
        categoriesIds: [],
        merchantStatus: null,
        search: 'Test',
        country: '',
        product: [],
      },
      mockSort,
      mockPagination,
      'groupId123',
      {}
    );

    expect(mockMerchantModel.count).toHaveBeenCalled();
    expect(mockHttpService.post).toHaveBeenCalled();
  });

  it('should apply category filter with include logic', async () => {
    mockMerchantModel.count.mockResolvedValue(1);
    mockMerchantModel.findAll.mockResolvedValueOnce([{ id: '1' }]).mockResolvedValueOnce([mockMerchants[0]]);

    mockHttpService.post.mockResolvedValue({
      data: { data: [] },
    });

    await service.getAllMerchants(
      {
        salesOwners: [],
        categoriesIds: ['cat1'],
        merchantStatus: null,
        search: '',
        country: '',
        product: [],
      },
      mockSort,
      mockPagination,
      'groupId123',
      {}
    );

    expect(mockMerchantModel.count).toHaveBeenCalled();
    expect(mockHttpService.post).toHaveBeenCalled();
  });

  it('should handle ordering transformation using snakeCase and lower SQL literal', async () => {
    mockMerchantModel.count.mockResolvedValue(1);
    mockMerchantModel.findAll
      .mockResolvedValueOnce([{ id: '1', name: 'Test Merchant' }])
      .mockResolvedValueOnce([mockMerchants[0]]);

    mockHttpService.post.mockResolvedValue({
      data: { data: [] },
    });

    await service.getAllMerchants(
      {
        salesOwners: [],
        categoriesIds: [],
        merchantStatus: null,
        search: '',
        country: '',
        product: [],
      },
      mockSort,
      mockPagination,
      'groupId123',
      {}
    );

    expect(mockMerchantModel.count).toHaveBeenCalled();
    expect(mockHttpService.post).toHaveBeenCalled();
  });

  it('should throw httpException when findAll method fails', async () => {
    mockMerchantModel.count.mockResolvedValue(2);
    mockMerchantModel.findAll.mockRejectedValue(new Error('dbError'));

    await expect(
      service.getAllMerchants(
        {
          salesOwners: [],
          categoriesIds: [],
          merchantStatus: null,
          search: '',
          country: '',
          product: [],
        },
        mockSort,
        mockPagination,
        'groupId123',
        {}
      )
    ).rejects.toThrow(new HttpException('Failed to fetch the group merchant details', HttpStatus.INTERNAL_SERVER_ERROR));

    expect(mockMerchantModel.count).toHaveBeenCalled();
    expect(mockMerchantModel.findAll).toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith('GroupMerchantService.getAllMerchants failed', {
      error: expect.any(Error),
    });
  });

  it('should throw httpException when count method fails', async () => {
    mockMerchantModel.count.mockRejectedValue(new Error('dbError'));

    await expect(
      service.getAllMerchants(
        {
          salesOwners: [],
          categoriesIds: [],
          merchantStatus: null,
          search: '',
          country: '',
          product: [],
        },
        mockSort,
        mockPagination,
        'groupId123',
        {}
      )
    ).rejects.toThrow(new HttpException('Failed to fetch the group merchant details', HttpStatus.INTERNAL_SERVER_ERROR));

    expect(mockMerchantModel.count).toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith('GroupMerchantService.getAllMerchants failed', {
      error: expect.any(Error),
    });
  });

  describe('Product and Merchant Status Filters', () => {
    beforeEach(() => {
      mockHttpService.post.mockResolvedValue({
        data: { data: [] },
      });
    });

    it('should apply maxOfferValue when multiple products are selected', async () => {
      mockMerchantModel.count.mockResolvedValue(1);
      mockMerchantModel.findAll.mockResolvedValueOnce([{ id: '1' }]).mockResolvedValueOnce([mockMerchants[0]]);

      await service.getAllMerchants(
        {
          salesOwners: [],
          categoriesIds: [],
          merchantStatus: null,
          search: '',
          country: '',
          product: [ProductEnum.CIRCLE, ProductEnum.CLO], // Multiple products
        },
        mockSort,
        mockPagination,
        'groupId123',
        {}
      );

      expect(mockMerchantModel.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            maxOfferValue: expect.objectContaining({ [Op.gt]: 0 }),
          }),
        })
      );
    });

    it('should apply both status and fastPaymentStatus when merchantStatus is provided with multiple products', async () => {
      mockMerchantModel.count.mockResolvedValue(1);
      mockMerchantModel.findAll.mockResolvedValueOnce([{ id: '1' }]).mockResolvedValueOnce([mockMerchants[0]]);

      await service.getAllMerchants(
        {
          salesOwners: [],
          categoriesIds: [],
          merchantStatus: MerchantStatusEnum.ACTIVE,
          search: '',
          country: '',
          product: [ProductEnum.CIRCLE, ProductEnum.CLO], // Multiple products
        },
        mockSort,
        mockPagination,
        'groupId123',
        {}
      );

      expect(mockMerchantModel.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: MerchantStatusEnum.ACTIVE,
            fastPaymentStatus: MerchantStatusEnum.ACTIVE,
          }),
        })
      );
    });

    it('should apply merchantStatus with OR condition when no product is specified', async () => {
      mockMerchantModel.count.mockResolvedValue(1);
      mockMerchantModel.findAll.mockResolvedValueOnce([{ id: '1' }]).mockResolvedValueOnce([mockMerchants[0]]);

      await service.getAllMerchants(
        {
          salesOwners: [],
          categoriesIds: [],
          merchantStatus: MerchantStatusEnum.ACTIVE,
          search: '',
          country: '',
          product: [], // No product specified
        },
        mockSort,
        mockPagination,
        'groupId123',
        {}
      );

      expect(mockMerchantModel.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            [Op.or]: {
              status: MerchantStatusEnum.ACTIVE,
              fastPaymentStatus: MerchantStatusEnum.ACTIVE,
            },
          }),
        })
      );
    });
  });

  describe('Merchant Admin Integration', () => {
    it('should correctly map merchant admins to merchants', async () => {
      const mockMerchantsWithToJSON = [
        {
          id: '1',
          name: 'Merchant 1',
          toJSON: jest.fn().mockReturnValue({ id: '1', name: 'Merchant 1' }),
        },
        {
          id: '2',
          name: 'Merchant 2',
          toJSON: jest.fn().mockReturnValue({ id: '2', name: 'Merchant 2' }),
        },
      ];

      const mockAdmins = [
        {
          id: 'admin1',
          name: 'Admin One',
          merchantUserLinks: [{ merchantId: '1', merchantUserId: 'admin1' }],
        },
        {
          id: 'admin2',
          name: 'Admin Two',
          merchantUserLinks: [{ merchantId: '2', merchantUserId: 'admin2' }],
        },
      ];

      mockMerchantModel.count.mockResolvedValue(2);
      mockMerchantModel.findAll
        .mockResolvedValueOnce([{ id: '1' }, { id: '2' }])
        .mockResolvedValueOnce(mockMerchantsWithToJSON);

      mockHttpService.post.mockResolvedValue({
        data: { data: mockAdmins },
      });

      const result = await service.getAllMerchants(
        {
          salesOwners: [],
          categoriesIds: [],
          merchantStatus: null,
          search: '',
          country: '',
          product: [],
        },
        mockSort,
        mockPagination,
        'groupId123',
        {}
      );

      expect(result.data[0].merchantAdmin).toEqual([
        expect.objectContaining({
          id: 'admin1',
          name: 'Admin One',
          merchantUserLinks: { merchantId: '1', merchantUserId: 'admin1' },
        }),
      ]);
      expect(result.data[1].merchantAdmin).toEqual([
        expect.objectContaining({
          id: 'admin2',
          name: 'Admin Two',
          merchantUserLinks: { merchantId: '2', merchantUserId: 'admin2' },
        }),
      ]);
    });

    it('should handle merchants without admin mappings', async () => {
      const mockMerchantsWithToJSON = [
        {
          id: '1',
          name: 'Merchant 1',
          toJSON: jest.fn().mockReturnValue({ id: '1', name: 'Merchant 1' }),
        },
        {
          id: '2',
          name: 'Merchant 2',
          toJSON: jest.fn().mockReturnValue({ id: '2', name: 'Merchant 2' }),
        },
      ];

      const mockAdmins = [
        {
          id: 'admin1',
          name: 'Admin One',
          merchantUserLinks: [{ merchantId: '1', merchantUserId: 'admin1' }], // Only merchant 1 has admin
        },
      ];

      mockMerchantModel.count.mockResolvedValue(2);
      mockMerchantModel.findAll
        .mockResolvedValueOnce([{ id: '1' }, { id: '2' }])
        .mockResolvedValueOnce(mockMerchantsWithToJSON);

      mockHttpService.post.mockResolvedValue({
        data: { data: mockAdmins },
      });

      const result = await service.getAllMerchants(
        {
          salesOwners: [],
          categoriesIds: [],
          merchantStatus: null,
          search: '',
          country: '',
          product: [],
        },
        mockSort,
        mockPagination,
        'groupId123',
        {}
      );

      expect(result.data[0].merchantAdmin).toEqual([
        expect.objectContaining({
          id: 'admin1',
          name: 'Admin One',
          merchantUserLinks: { merchantId: '1', merchantUserId: 'admin1' },
        }),
      ]);
      expect(result.data[1].merchantAdmin).toEqual([]);
    });

    it('should handle admin with multiple merchant links', async () => {
      const mockMerchantsWithToJSON = [
        {
          id: '1',
          name: 'Merchant 1',
          toJSON: jest.fn().mockReturnValue({ id: '1', name: 'Merchant 1' }),
        },
        {
          id: '2',
          name: 'Merchant 2',
          toJSON: jest.fn().mockReturnValue({ id: '2', name: 'Merchant 2' }),
        },
      ];

      const mockAdmins = [
        {
          id: 'admin1',
          name: 'Admin One',
          merchantUserLinks: [
            { merchantId: '1', merchantUserId: 'admin1' },
            { merchantId: '2', merchantUserId: 'admin1' },
          ], // One admin for multiple merchants
        },
      ];

      mockMerchantModel.count.mockResolvedValue(2);
      mockMerchantModel.findAll
        .mockResolvedValueOnce([{ id: '1' }, { id: '2' }])
        .mockResolvedValueOnce(mockMerchantsWithToJSON);

      mockHttpService.post.mockResolvedValue({
        data: { data: mockAdmins },
      });

      const result = await service.getAllMerchants(
        {
          salesOwners: [],
          categoriesIds: [],
          merchantStatus: null,
          search: '',
          country: '',
          product: [],
        },
        mockSort,
        mockPagination,
        'groupId123',
        {}
      );

      expect(result.data[0].merchantAdmin).toEqual([
        expect.objectContaining({
          id: 'admin1',
          name: 'Admin One',
          merchantUserLinks: { merchantId: '1', merchantUserId: 'admin1' },
        }),
      ]);

      expect(result.data[1].merchantAdmin).toEqual([
        expect.objectContaining({
          id: 'admin1',
          name: 'Admin One',
          merchantUserLinks: { merchantId: '2', merchantUserId: 'admin1' },
        }),
      ]);
    });
  });
  describe('getMerchantUserLinks', () => {
    it('should return merchant user links on success', async () => {
      const userId = 'u123';
      const mockData = [{ merchantId: 'm1' }];
      (mockHttpService.get as jest.Mock).mockResolvedValue({ data: { data: mockData } });

      const result = await (service as any).getMerchantUserLinks(userId);

      expect(mockHttpService.get).toHaveBeenCalledWith(
        `${process.env.MERCHANT_IDENTITY_URL}/merchants/merchant-user-links/${userId}`
      );
      expect(result).toEqual(mockData);
    });

    it('should return empty array on error', async () => {
      (mockHttpService.get as jest.Mock).mockRejectedValue(new HttpException('fail', HttpStatus.BAD_REQUEST));

      const result = await (service as any).getMerchantUserLinks('u123');

      expect(mockLogger.error).toHaveBeenCalledWith('GroupMerchantService.getMerchantUserLinks failed', expect.anything());
      expect(result).toEqual([]);
    });
  });
  describe('MERCHANT_USER Filter Logic', () => {
    beforeEach(() => {
      mockHttpService.post.mockResolvedValue({
        data: { data: [] },
      });
    });

    it('should filter merchants by user merchantIds when user type is MERCHANT_USER', async () => {
      const mockMerchantUserLinks = [{ merchantId: 'merchant1' }, { merchantId: 'merchant2' }];

      const merchantUser = {
        type: 'MERCHANT_USER',
        id: 'user123',
      };

      mockHttpService.get.mockResolvedValue({
        data: { data: mockMerchantUserLinks },
      });

      mockMerchantModel.count.mockResolvedValue(2);
      mockMerchantModel.findAll
        .mockResolvedValueOnce([{ id: 'merchant1' }, { id: 'merchant2' }])
        .mockResolvedValueOnce([mockMerchants[0], mockMerchants[1]]);

      await service.getAllMerchants(
        {
          salesOwners: [],
          categoriesIds: [],
          merchantStatus: null,
          search: '',
          country: '',
          product: [],
        },
        mockSort,
        mockPagination,
        'groupId123',
        merchantUser
      );

      // Verify getMerchantUserLinks was called with correct userId
      expect(mockHttpService.get).toHaveBeenCalledWith(
        `${process.env.MERCHANT_IDENTITY_URL}/merchants/merchant-user-links/user123`
      );

      // Verify that the query was called with merchant IDs filter
      expect(mockMerchantModel.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            groupId: 'groupId123',
            id: ['merchant1', 'merchant2'], // Should filter by these merchant IDs
          }),
        })
      );
    });

    it('should not apply merchant filter when MERCHANT_USER has no merchant links', async () => {
      const merchantUser = {
        type: 'MERCHANT_USER',
        id: 'user123',
      };

      // Mock empty merchant user links
      mockHttpService.get.mockResolvedValue({
        data: { data: [] },
      });

      mockMerchantModel.count.mockResolvedValue(0);
      mockMerchantModel.findAll.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await service.getAllMerchants(
        {
          salesOwners: [],
          categoriesIds: [],
          merchantStatus: null,
          search: '',
          country: '',
          product: [],
        },
        mockSort,
        mockPagination,
        'groupId123',
        merchantUser
      );

      // Verify getMerchantUserLinks was called
      expect(mockHttpService.get).toHaveBeenCalledWith(
        `${process.env.MERCHANT_IDENTITY_URL}/merchants/merchant-user-links/user123`
      );

      // Verify that no merchant ID filter was applied (only groupId should be in where clause)
      expect(mockMerchantModel.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            groupId: 'groupId123',
            // Should NOT contain 'id' property since merchantUserLinks was empty
          }),
        })
      );

      // Ensure 'id' property is not in the where clause
      const countCallArgs = mockMerchantModel.count.mock.calls[0][0];
      expect(countCallArgs.where).not.toHaveProperty('id');
    });

    it('should not apply merchant filter when user type is not MERCHANT_USER', async () => {
      const regularUser = {
        type: 'ADMIN_USER',
        id: 'user123',
      };

      mockMerchantModel.count.mockResolvedValue(2);
      mockMerchantModel.findAll
        .mockResolvedValueOnce([{ id: '1' }, { id: '2' }])
        .mockResolvedValueOnce([mockMerchants[0], mockMerchants[1]]);

      await service.getAllMerchants(
        {
          salesOwners: [],
          categoriesIds: [],
          merchantStatus: null,
          search: '',
          country: '',
          product: [],
        },
        mockSort,
        mockPagination,
        'groupId123',
        regularUser
      );

      // Verify getMerchantUserLinks was NOT called
      expect(mockHttpService.get).not.toHaveBeenCalled();

      // Verify that no merchant ID filter was applied
      expect(mockMerchantModel.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            groupId: 'groupId123',
          }),
        })
      );

      const countCallArgs = mockMerchantModel.count.mock.calls[0][0];
      expect(countCallArgs.where).not.toHaveProperty('id');
    });

    it('should not apply merchant filter when user type is MERCHANT_USER but no user id', async () => {
      const merchantUserWithoutId = {
        type: 'MERCHANT_USER',
        // No id property
      };

      mockMerchantModel.count.mockResolvedValue(2);
      mockMerchantModel.findAll
        .mockResolvedValueOnce([{ id: '1' }, { id: '2' }])
        .mockResolvedValueOnce([mockMerchants[0], mockMerchants[1]]);

      await service.getAllMerchants(
        {
          salesOwners: [],
          categoriesIds: [],
          merchantStatus: null,
          search: '',
          country: '',
          product: [],
        },
        mockSort,
        mockPagination,
        'groupId123',
        merchantUserWithoutId
      );

      // Verify getMerchantUserLinks was NOT called
      expect(mockHttpService.get).not.toHaveBeenCalled();

      // Verify that no merchant ID filter was applied
      const countCallArgs = mockMerchantModel.count.mock.calls[0][0];
      expect(countCallArgs.where).not.toHaveProperty('id');
    });

    it('should handle getMerchantUserLinks failure gracefully', async () => {
      const merchantUser = {
        type: 'MERCHANT_USER',
        id: 'user123',
      };

      // Mock getMerchantUserLinks to return empty array on error
      mockHttpService.get.mockRejectedValue(new Error('API Error'));

      mockMerchantModel.count.mockResolvedValue(2);
      mockMerchantModel.findAll
        .mockResolvedValueOnce([{ id: '1' }, { id: '2' }])
        .mockResolvedValueOnce([mockMerchants[0], mockMerchants[1]]);

      await service.getAllMerchants(
        {
          salesOwners: [],
          categoriesIds: [],
          merchantStatus: null,
          search: '',
          country: '',
          product: [],
        },
        mockSort,
        mockPagination,
        'groupId123',
        merchantUser
      );

      // Verify error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        'GroupMerchantService.getMerchantUserLinks failed',
        expect.objectContaining({
          error: expect.any(Error),
        })
      );

      // Since getMerchantUserLinks returns empty array on error, no merchant filter should be applied
      const countCallArgs = mockMerchantModel.count.mock.calls[0][0];
      expect(countCallArgs.where).not.toHaveProperty('id');
    });
  });
});
