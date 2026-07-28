import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { HttpException, HttpStatus } from '@nestjs/common';

import { Merchant } from 'src/merchant/entities/merchant.model';
import { GroupMerchantService } from 'src/merchant/shared/group-merchant.service';
import { Sequelize } from 'sequelize-typescript';

import { MerchantStatusEnum } from 'src/merchant/enums/merchant-status.enum';
import { ErrorMessages } from 'src/errors/error-messages';
import { CreateGroupDto } from 'src/groups/dtos/create-group.dto';
import { UpdateGroupLogoDto } from 'src/groups/dtos/update-group-logo.dto';
import { UpdateGroupDto } from 'src/groups/dtos/update-group.dto';
import { Group } from 'src/groups/entities/group.model';
import { GenericHttpService } from 'src/http/generic-http.service';
import { GroupService } from '../group.service';
import { buildQueryOptions } from 'src/common/helpers/query-utils';
import { SortDto } from 'src/common/dtos/sort.dto';
import { PaginationDto } from 'src/common/dtos/pagenation.dto';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';
jest.mock('src/common/helpers/query-utils');
describe('GroupService', () => {
  let service: GroupService;
  let groupModel: any;
  let merchantModel: any;
  let groupMerchantService: any;
  let sequelize: any;
  let httpService: any;

  const mockGroupModelProvider = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findOrCreate: jest.fn(),
    findAndCountAll: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  };

  const mockMerchantModelProvider = {
    findAll: jest.fn(),
    update: jest.fn(),
  };

  const mockGroupMerchantService = {
    getAllMerchants: jest.fn(),
  };

  const mockSequelizeProvider = {
    transaction: jest.fn(),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockLogger = {
    info:jest.fn(),
    error:jest.fn()
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupService,
        {
          provide: getModelToken(Group),
          useValue: mockGroupModelProvider,
        },
        {
          provide: getModelToken(Merchant),
          useValue: mockMerchantModelProvider,
        },
        {
          provide: GroupMerchantService,
          useValue: mockGroupMerchantService,
        },
        {
          provide: Sequelize,
          useValue: mockSequelizeProvider,
        },
        {
          provide: GenericHttpService,
          useValue: mockHttpService,
        },
        {
          provide:CustomPinoLogger,
          useValue:mockLogger
        }
      ],
    }).compile();

    service = module.get<GroupService>(GroupService);
    groupModel = module.get(getModelToken(Group));
    merchantModel = module.get(getModelToken(Merchant));
    groupMerchantService = module.get<GroupMerchantService>(GroupMerchantService);
    sequelize = module.get<Sequelize>(Sequelize);
    httpService = module.get<GenericHttpService>(GenericHttpService);
  
    // Mock process.env
    process.env = {
      ...process.env,
      CORE_MERCHANT_URL: 'https://core-merchant-url',
      FNB_CATEGORY_LOGO: 'category-logo-url',
      FNB_CATEGORY_ID: 'category-id',
      FNB_CATEGORY_NAME: 'category-name',
      CORE_PAYOUT_URL: 'https://core-payout-url'
    };
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a group and sync with core', async () => {
      // Arrange
      const createGroupDto: CreateGroupDto = { name: 'Test Group', merchantIds: [] } as any;
      const updatedBy = 'test-user';
      const mockGroup = { id: 'group-id', name: 'Test Group' };
      
      groupModel.findOrCreate.mockResolvedValue([mockGroup]);
      httpService.post.mockResolvedValue({});

      // Act
      const result = await service.create(createGroupDto, updatedBy);

      // Assert
      expect(groupModel.findOrCreate).toHaveBeenCalledWith({
        transaction: null,
        defaults: {
          name: createGroupDto.name,
          updatedBy
        },
        where: {
          name: createGroupDto.name
        }
      });
      expect(httpService.post).toHaveBeenCalled();
      expect(result).toEqual(mockGroup);
    });

    it('should use transaction if provided', async () => {
      // Arrange
      const createGroupDto: CreateGroupDto = { name: 'Test Group', merchantIds: [] } as any;
      const updatedBy = 'test-user';
      const mockGroup = { id: 'group-id', name: 'Test Group' };
      const mockTransaction = {} as any;
      
      groupModel.findOrCreate.mockResolvedValue([mockGroup]);
      httpService.post.mockResolvedValue({});

      // Act
      await service.create(createGroupDto, updatedBy, mockTransaction);

      // Assert
      expect(groupModel.findOrCreate).toHaveBeenCalledWith({
        transaction: mockTransaction,
        defaults: {
          name: createGroupDto.name,
          updatedBy
        },
        where: {
          name: createGroupDto.name
        }
      });
    });
  });

  describe('findAllGroupWithMerchants', () => {
    it('should return groups with merchant counts', async () => {
      // Arrange
      const searchQuery = 'test';
      const paginationDto = { page: 1, limit: 10 };
      const sortDto = { sort: ['name,asc'] };
      
      const mockGroups = [
        { id: 'group-1', name: 'Group 1', logo: 'logo1', createdAt: new Date() },
        { id: 'group-2', name: 'Group 2', logo: 'logo2', createdAt: new Date() }
      ];
      
      const mockMerchants = [
        { id: 'merchant-1', groupId: 'group-1' },
        { id: 'merchant-2', groupId: 'group-1' },
        { id: 'merchant-3', groupId: 'group-2' }
      ];
      
      groupModel.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: mockGroups
      });
      
      merchantModel.findAll.mockResolvedValue(mockMerchants);

      // Act
      const result = await service.findAllGroupWithMerchants(searchQuery, paginationDto, sortDto);

      // Assert
      expect(groupModel.findAndCountAll).toHaveBeenCalledWith({
        where: { name: { [Symbol.for('iLike')]: '%test%' }, deletedAt: null },
        order: [['name', 'asc']],
        offset: 0,
        limit: 10
      });
      
      expect(merchantModel.findAll).toHaveBeenCalled();
      
      expect(result.data).toEqual([
        {
          id: 'group-1',
          name: 'Group 1',
          logo: 'logo1',
          createdAt: mockGroups[0].createdAt,
          merchantsCount: 2
        },
        {
          id: 'group-2',
          name: 'Group 2',
          logo: 'logo2',
          createdAt: mockGroups[1].createdAt,
          merchantsCount: 1
        }
      ]);
      
      expect(result.pagination).toEqual({
        page: 1,
        pageCount: 1,
        total: 2,
        count: 2,
        hasNextPage: false,
        hasPreviousPage: false
      });
    });

    it('should apply default sorting when sort is not provided', async () => {
      // Arrange
      const searchQuery = null;
      const paginationDto = { page: 1, limit: 10 };
      const sortDto = {};
      
      groupModel.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: []
      });
      
      merchantModel.findAll.mockResolvedValue([]);

      // Act
      await service.findAllGroupWithMerchants(searchQuery, paginationDto, sortDto as any);

      // Assert
      expect(groupModel.findAndCountAll).toHaveBeenCalledWith({
        where: null,
        order: [['createdAt', 'desc']],
        offset: 0,
        limit: 10
      });
    });

    it('should work without pagination', async () => {
      // Arrange
      const searchQuery = null;
      const paginationDto = {};
      const sortDto = {};
      
      groupModel.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: []
      });
      
      merchantModel.findAll.mockResolvedValue([]);

      // Act
      await service.findAllGroupWithMerchants(searchQuery, paginationDto as any, sortDto as any);

      // Assert
      expect(groupModel.findAndCountAll).toHaveBeenCalledWith({
        where: null,
        order: [['createdAt', 'desc']],
        offset: 0,
        limit: undefined
      });
    });
  });

  describe('getGroupDetails', () => {
    const  mockSort ={sort:['createdAt','desc']} 
      const mockPagination = {page:1,limit:10}
    it('should return group details with merchants', async () => {
      // Arrange

      const customFilters = {} as any;
      const groupId = 'group-id';
      
      const mockGroup = {
        id: groupId,
        name: 'Test Group',
        nameAr: 'Test Group AR',
        logo: 'logo-url'
      };
      
      const mockMerchants = { data: [{ id: 'merchant-1' }] };
      
      groupModel.findOne.mockResolvedValue(mockGroup);
      groupMerchantService.getAllMerchants.mockResolvedValue(mockMerchants);

      // Act
      const result = await service.getGroupDetails( customFilters, groupId,mockSort,mockPagination);

      // Assert
      expect(groupModel.findOne).toHaveBeenCalledWith({
        where: { id: groupId, deletedAt: null }
      });
      
      expect(groupMerchantService.getAllMerchants).toHaveBeenCalledWith(
        customFilters,
        mockSort,
        mockPagination,
        groupId,
        null,
      );
      
      expect(result).toEqual({
        id: mockGroup.id,
        name: mockGroup.name,
        nameAr: mockGroup.nameAr,
        logo: mockGroup.logo,
        merchants: mockMerchants
      });
    });

    it('should return empty array when group is not found', async () => {
      // Arrange
      const customFilters = {} as any;
      const groupId = 'non-existent-group';
      
      groupModel.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getGroupDetails( customFilters, groupId,mockSort,mockPagination);

      // Assert
      expect(result).toEqual([]);
      expect(groupMerchantService.getAllMerchants).not.toHaveBeenCalled();
    });
  });

  describe('insert', () => {
    it('should insert a group with merchants in a transaction', async () => {
      // Arrange
      const createGroupDto: CreateGroupDto = {
        name: 'New Group',
        nameAr: 'New Group AR',
        merchantIds: ['merchant-1', 'merchant-2']
      } as any;
      const updatedBy = 'test-user';
      
      const mockGroup = {
        id: 'new-group-id',
        name: createGroupDto.name,
        nameAr: createGroupDto.nameAr
      };
      
      const mockTransaction = {};
      sequelize.transaction.mockImplementation(async (callback) => {
        return await callback(mockTransaction);
      });
      
      groupModel.findOrCreate.mockResolvedValue([mockGroup]);
      merchantModel.update.mockResolvedValue([1]);
      httpService.post.mockResolvedValue({});

      // Act
      const result = await service.insert(createGroupDto, updatedBy);

      // Assert
      expect(sequelize.transaction).toHaveBeenCalled();
      
      expect(groupModel.findOrCreate).toHaveBeenCalledWith({
        defaults: {
          name: createGroupDto.name,
          nameAr: createGroupDto.nameAr,
          updatedBy
        },
        where: {
          name: createGroupDto.name,
          deletedAt: null
        },
        transaction: mockTransaction
      });
      
      expect(merchantModel.update).toHaveBeenCalledTimes(2);
      expect(merchantModel.update).toHaveBeenCalledWith(
        { groupId: mockGroup.id, updatedBy },
        {
          where: { id: 'merchant-1' },
          returning: true,
          transaction: mockTransaction
        }
      );
      
      expect(httpService.post).toHaveBeenCalled();
      expect(result).toEqual(mockGroup);
    });

    it('should use name for nameAr if not provided', async () => {
      // Arrange
      const createGroupDto: CreateGroupDto = {
        name: 'New Group',
        merchantIds: ['merchant-1']
      } as any;
      const updatedBy = 'test-user';
      
      const mockGroup = {
        id: 'new-group-id',
        name: createGroupDto.name
      };
      
      sequelize.transaction.mockImplementation(async (callback) => {
        return await callback({});
      });
      
      groupModel.findOrCreate.mockResolvedValue([mockGroup]);
      merchantModel.update.mockResolvedValue([1]);
      httpService.post.mockResolvedValue({});

      // Act
      await service.insert(createGroupDto, updatedBy);

      // Assert
      expect(groupModel.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          defaults: expect.objectContaining({
            nameAr: createGroupDto.name
          })
        })
      );
    });

    it('should throw HttpException when an error occurs', async () => {
      // Arrange
      const createGroupDto: CreateGroupDto = {
        name: 'New Group',
        merchantIds: ['merchant-1']
      } as any;
      const updatedBy = 'test-user';
      
      sequelize.transaction.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(service.insert(createGroupDto, updatedBy))
        .rejects
        .toThrow(new HttpException(ErrorMessages.group.groupInsertion, HttpStatus.BAD_REQUEST));
    });
  });

  describe('delete', () => {
    it('should delete a group and update merchants when no active merchants exist', async () => {
      // Arrange
      const groupId = 'group-id';
      const updatedBy = 'test-user';
      
      const mockMerchants = [
        { id: 'merchant-1', status: MerchantStatusEnum.PENDING },
        { id: 'merchant-2', status: MerchantStatusEnum.DISABLED }
      ];
      
      const mockTransaction = {};
      sequelize.transaction.mockImplementation(async (callback) => {
        return await callback(mockTransaction);
      });
      
      merchantModel.findAll.mockResolvedValue(mockMerchants);
      groupModel.destroy.mockResolvedValue(1);
      merchantModel.update.mockResolvedValue([2]);

      // Act
      await service.delete(groupId, updatedBy);

      // Assert
      expect(sequelize.transaction).toHaveBeenCalled();
      
      expect(merchantModel.findAll).toHaveBeenCalledWith({
        where: { groupId }
      });
      
      expect(groupModel.destroy).toHaveBeenCalledWith({
        where: { id: groupId },
        transaction: mockTransaction
      });
      
      expect(merchantModel.update).toHaveBeenCalledWith(
        {
          groupId: null,
          updatedBy
        },
        {
          where: { groupId },
          returning: true,
          transaction: mockTransaction
        }
      );
    });

    it('should throw HttpException when active merchants exist', async () => {
      // Arrange
      const groupId = 'group-id';
      const updatedBy = 'test-user';
      
      const mockMerchants = [
        { id: 'merchant-1', status: MerchantStatusEnum.ACTIVE },
        { id: 'merchant-2', status: MerchantStatusEnum.PENDING }
      ];
      
      sequelize.transaction.mockImplementation(async (callback) => {
        return await callback({});
      });
      
      merchantModel.findAll.mockResolvedValue(mockMerchants);

      // Act & Assert
      await expect(service.delete(groupId, updatedBy))
        .rejects
        .toThrow(new HttpException(
          ErrorMessages.group.groupDeletionFailedMerchantActive,
          HttpStatus.BAD_REQUEST
        ));
      
      expect(groupModel.destroy).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update group and sync with core', async () => {
      // Arrange
      const updateGroupDto: UpdateGroupDto = {
        id: 'group-id',
        name: 'Updated Group',
        nameAr: 'Updated Group AR',
        attachMerchantIds: ['merchant-1'],
        detachMerchantIds: ['merchant-2']
      };
      const updatedBy = 'test-user';
      
      const mockGroup = {
        id: updateGroupDto.id,
        name: 'Old Name',
        logo: 'logo-url'
      };
      
      const mockTransaction = {};
      sequelize.transaction.mockImplementation(async (callback) => {
        return await callback(mockTransaction);
      });
      
      groupModel.update.mockResolvedValue([1]);
      groupModel.findOne.mockResolvedValue(mockGroup);
      merchantModel.update.mockResolvedValue([1]);
      httpService.post.mockResolvedValue({});

      // Act
      await service.update(updateGroupDto, updatedBy);

      // Assert
      expect(sequelize.transaction).toHaveBeenCalled();
      
      // Check detach merchant call
      expect(merchantModel.update).toHaveBeenCalledWith(
        {
          groupId: null,
          updatedBy
        },
        {
          where: { id: 'merchant-2' },
          transaction: mockTransaction
        }
      );
      
      // Check attach merchant call
      expect(merchantModel.update).toHaveBeenCalledWith(
        {
          groupId: updateGroupDto.id,
          updatedBy
        },
        {
          where: { id: 'merchant-1' },
          transaction: mockTransaction
        }
      );
      
      // Check group update call
      expect(groupModel.update).toHaveBeenCalledWith(
        {
          name: updateGroupDto.name,
          nameAr: updateGroupDto.nameAr,
          updatedBy
        },
        {
          where: { id: updateGroupDto.id, deletedAt: null },
          transaction: mockTransaction
        }
      );
      
      // Check core sync
      expect(httpService.post).toHaveBeenCalled();
    });

    it('should use name for nameAr if not provided', async () => {
      // Arrange
      const updateGroupDto: UpdateGroupDto = {
        id: 'group-id',
        name: 'Updated Group',
        attachMerchantIds: [],
        detachMerchantIds: []
      } as any;
      const updatedBy = 'test-user';
      
      const mockGroup = {
        id: updateGroupDto.id,
        name: 'Old Name',
        logo: 'logo-url'
      };
      
      sequelize.transaction.mockImplementation(async (callback) => {
        return await callback({});
      });
      
      groupModel.update.mockResolvedValue([1]);
      groupModel.findOne.mockResolvedValue(mockGroup);
      httpService.post.mockResolvedValue({});

      // Act
      await service.update(updateGroupDto, updatedBy);

      // Assert
      expect(groupModel.update).toHaveBeenCalledWith(
        {
          name: updateGroupDto.name,
          nameAr: updateGroupDto.name,
          updatedBy
        },
        expect.any(Object)
      );
    });

    it('should throw HttpException when update fails', async () => {
      // Arrange
      const updateGroupDto: UpdateGroupDto = {
        id: 'group-id',
        name: 'Updated Group',
        attachMerchantIds: [],
        detachMerchantIds: []
      } as any;
      const updatedBy = 'test-user';
      
      sequelize.transaction.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(service.update(updateGroupDto, updatedBy))
        .rejects
        .toThrow(new HttpException(ErrorMessages.group.groupUpdation, HttpStatus.BAD_REQUEST));
    });
  });

  describe('updateLogo', () => {
    it('should update group logo', async () => {
      // Arrange
      const updateGroupLogoDto: UpdateGroupLogoDto = {
        id: 'group-id',
        url: 'new-logo-url'
      };
      const updatedBy = 'test-user';
      
      groupModel.update.mockResolvedValue([1]);

      // Act
      await service.updateLogo(updateGroupLogoDto, updatedBy);

      // Assert
      expect(groupModel.update).toHaveBeenCalledWith(
        {
          logo: updateGroupLogoDto.url,
          updatedBy
        },
        {
          where: { id: updateGroupLogoDto.id, deletedAt: null }
        }
      );
    });

    it('should throw HttpException when update fails', async () => {
      // Arrange
      const updateGroupLogoDto: UpdateGroupLogoDto = {
        id: 'group-id',
        url: 'new-logo-url'
      };
      const updatedBy = 'test-user';
      
      groupModel.update.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(service.updateLogo(updateGroupLogoDto, updatedBy))
        .rejects
        .toThrow(new HttpException(ErrorMessages.group.groupUpdation, HttpStatus.BAD_REQUEST));
    });
  });

  describe('syncGroupWithCore', () => {
    it('should call http service with correct data', async () => {
      // Arrange
      const group = {
        id: 'group-id',
        name: 'Test Group',
        nameAr: 'Test Group AR',
        logo: 'logo-url'
      };
      
      httpService.post.mockResolvedValue({});

      // Use any to access private method
      const syncGroupWithCore = (service as any).syncGroupWithCore.bind(service);

      // Act
      await syncGroupWithCore(group);

      // Assert
      expect(httpService.post).toHaveBeenCalledWith(
        'https://core-payout-url/merchant-outlet/group',
        {
          groupId: group.id,
          groupName: group.name,
          groupNameAr: group.nameAr,
          groupLogo: group.logo,
          categoryLogo: 'category-logo-url',
          categoryId: 'category-id',
          categoryName: 'category-name'
        }
      );
    });

    it('should use name for nameAr if not provided', async () => {
      // Arrange
      const group = {
        id: 'group-id',
        name: 'Test Group',
        logo: 'logo-url'
      };
      
      httpService.post.mockResolvedValue({});

      // Use any to access private method
      const syncGroupWithCore = (service as any).syncGroupWithCore.bind(service);

      // Act
      await syncGroupWithCore(group);

      // Assert
      expect(httpService.post).toHaveBeenCalledWith(
        'https://core-payout-url/merchant-outlet/group',
        expect.objectContaining({
          groupNameAr: group.name
        })
      );
    });
  });

  describe('pagination', () => {
    it('should return pagination object with correct values', () => {
      // Arrange
      const page = 2;
      const limit = 10;
      const rows = Array(5).fill({});
      const count = 25;

      // Use any to access private method
      const pagination = (service as any).pagination.bind(service);

      // Act
      const result = pagination(page, limit, rows, count);

      // Assert
      expect(result).toEqual({
        page: 2,
        pageCount: 3,
        total: 25,
        count: 5,
        hasNextPage: true,
        hasPreviousPage: true
      });
    });

    it('should return undefined when page or limit is not provided', () => {
      // Arrange
      const rows = Array(5).fill({});
      const count = 25;

      // Use any to access private method
      const pagination = (service as any).pagination.bind(service);

      // Act
      const result = pagination(undefined, undefined, rows, count);

      // Assert
      expect(result).toBeUndefined();
    });
  });
  describe('findGroup', () => {
      const mockQuery = {  where: {
          name: 'group-name'
        }}
  it('should return group details when found', async () => {
  
    const mockGroup = { id: 'group-123', name: 'Test Group' };

    // Mock groupModel.findOne to resolve with mockGroup
    groupModel.findOne.mockResolvedValue(mockGroup);

    // Call the method
    const result = await service.findGroup(mockQuery);

    // Assertions
    expect(service.groupModel.findOne).toHaveBeenCalledWith(mockQuery);
    expect(result).toEqual(mockGroup);
  });

  it('should return null when no group found', async () => {

    // Mock groupModel.findOne to resolve with null
  groupModel.findOne.mockResolvedValue(null);

    const result = await service.findGroup(mockQuery);

    expect(service.groupModel.findOne).toHaveBeenCalledWith(mockQuery);
    expect(result).toBeNull();
  });
});

  describe('findAll',()=>{
    const mockBuildQueryOption = buildQueryOptions as jest.Mock
        const sortDto: SortDto ={sort:['createdAt,desc']};
            const paginationDto: PaginationDto = { page: 1, limit: 10 };
            const search = 'test';
      const mockQueryOptions = { where: { name: { [Symbol('Op.iLike')]: '%test%' } }, order: [['name', 'ASC']] };
    it('should return the group details with query options',async()=>{
      //Arrange
   
      const mockGroup = [{id:'group-id',
        name:'name'
      }]
      mockBuildQueryOption.mockReturnValue(mockQueryOptions)
      groupModel.findAll.mockResolvedValue(mockGroup)

      //Act
      const result = await service.findAll(sortDto,paginationDto,search)

      //Assert
      expect(mockBuildQueryOption).toHaveBeenCalledWith({
        sortDto:sortDto,
        paginationDto:paginationDto,
        searchQuery:search
      })
      expect(groupModel.findAll).toHaveBeenCalledWith(mockQueryOptions)
      expect(result).toEqual(mockGroup)
    })
    it('should throw error if findAll method failed',async()=>{
      //arrange
mockBuildQueryOption.mockReturnValue(mockQueryOptions);
groupModel.findAll.mockRejectedValue(new Error('Db Error'))

//Act
    await expect(service.findAll(sortDto,paginationDto,search))
    .rejects.toThrow(new HttpException('Failed to fetch the group details',HttpStatus.INTERNAL_SERVER_ERROR))
  expect(mockBuildQueryOption).toHaveBeenCalledWith({
        sortDto:sortDto,
        paginationDto:paginationDto,
        searchQuery:search
      })
      expect(mockLogger.error).toHaveBeenCalled()
    
      
    })
  })
});