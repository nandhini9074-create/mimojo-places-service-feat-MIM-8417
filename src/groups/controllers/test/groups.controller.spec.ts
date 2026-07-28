

import { TestingModule, Test } from '@nestjs/testing';
import { AuthHeaderService } from 'src/auth/services/auth.validator.service';
import { CreateGroupDto } from 'src/groups/dtos/create-group.dto';
import { UpdateGroupLogoDto } from 'src/groups/dtos/update-group-logo.dto';
import { UpdateGroupDto } from 'src/groups/dtos/update-group.dto';
import { GroupService } from 'src/groups/services/group.service';
import { GroupsController } from '../groups.controller';

describe('GroupsController', () => {
  let controller: GroupsController;
  let groupService: GroupService;
  let authHeaderService: AuthHeaderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupsController],
      providers: [
        {
          provide: GroupService,
          useValue: {
            findAll: jest.fn(),
            create: jest.fn(),
            findAllGroupWithMerchants: jest.fn(),
            getGroupDetails: jest.fn(),
            insert: jest.fn(),
            updateLogo: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: AuthHeaderService,
          useValue: {
            getUserId: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<GroupsController>(GroupsController);
    groupService = module.get<GroupService>(GroupService);
    authHeaderService = module.get<AuthHeaderService>(AuthHeaderService);
  });



  describe('create', () => {
    it('should create a group successfully', async () => {
      (authHeaderService.getUserId as jest.Mock).mockResolvedValue('mockUserId');
      await controller.create({} as CreateGroupDto, { authorization: '<mock-auth>' });
      expect(groupService.create).toHaveBeenCalled();
    });

    it('should throw error if groupService.create fails', async () => {
      (authHeaderService.getUserId as jest.Mock).mockResolvedValue('mockUserId');
      (groupService.create as jest.Mock).mockRejectedValue(new Error('Create Error'));
      await expect(controller.create({} as CreateGroupDto, { authorization: '<mock-auth>' })).rejects.toThrow('Create Error');
    });
  });

  describe('getGroupsWithMerchants', () => {
    it('should return groups with merchants', async () => {
      const result = [{ id: '1', name: 'Group1', merchants: [] }];
      (groupService.findAllGroupWithMerchants as jest.Mock).mockResolvedValue(result);
      expect(await controller.getGroupsWithMerchants()).toEqual({
        statusCode: 200,
        message: 'Success',
        data: result,
      });
    });

    it('should throw error when findAllGroupWithMerchants fails', async () => {
      (groupService.findAllGroupWithMerchants as jest.Mock).mockRejectedValue(new Error('Fetch Error'));
      await expect(controller.getGroupsWithMerchants()).rejects.toThrow('Fetch Error');
    });
  });

  describe('getGroupDetails', () => {
    it('should return group details', async () => {
      const result = { id: '1', name: 'Group1' };
      (groupService.getGroupDetails as jest.Mock).mockResolvedValue(result);
      expect(await controller.getGroupDetails('some-uuid')).toEqual({
        statusCode: 200,
        message: 'Success',
        data: result,
      });
    });


    it('should throw error when getGroupDetails fails', async () => {
      (groupService.getGroupDetails as jest.Mock).mockRejectedValue(new Error('Details Error'));
      await expect(controller.getGroupDetails('valid-uuid')).rejects.toThrow('Details Error');
    });
  });

  describe('insert', () => {
    const mockResponse = { data: {}, message: 'Success', statusCode: 200 };
    it('should insert group successfully', async () => {
      (authHeaderService.getUserId as jest.Mock).mockResolvedValue('mockUserId');
      (groupService.insert as jest.Mock).mockResolvedValue({});
      expect(await controller.insert({} as CreateGroupDto, { authorization: '<mock-auth>' })).toEqual(mockResponse);
    });

  });

  describe('updateLogo', () => {
    const mockResponse = { data: {}, message: 'Success', statusCode: 200 };
    it('should update logo successfully', async () => {
      (authHeaderService.getUserId as jest.Mock).mockResolvedValue('mockUserId');
      (groupService.updateLogo as jest.Mock).mockResolvedValue({});
      expect(await controller.updateLogo({} as UpdateGroupLogoDto, { authorization: '<mock-auth>' })).toEqual(mockResponse);
    });


  });

  describe('update', () => {
    const mockResponse = { data: {}, message: 'Success', statusCode: 200 };
    it('should update group successfully', async () => {
      (authHeaderService.getUserId as jest.Mock).mockResolvedValue('mockUserId');
      (groupService.update as jest.Mock).mockResolvedValue({});
      expect(await controller.update({} as UpdateGroupDto, { authorization: '<mock-auth>' })).toEqual(mockResponse);
    });


  });

  describe('delete', () => {
    const mockResponse = { data: {}, message: 'Success', statusCode: 200 };
    it('should delete group successfully', async () => {
      (authHeaderService.getUserId as jest.Mock).mockResolvedValue('mockUserId');
      (groupService.delete as jest.Mock).mockResolvedValue({});
      expect(await controller.delete('some-uuid', { authorization: '<mock-auth>' })).toEqual(mockResponse);
    });
  });

  describe('getGroups', () => {
    const mockGroups = [{ id: '1', name: 'Test Group' }];
    const mockResponse = { data: mockGroups, message: 'Success', statusCode: 200 };
    it('should return response from baseResponseHelper with groups', async () => {
      const sortDto = { sort: ['name:asc'] };
      const paginationDto = { page: 1, limit: 10 };
      const searchQuery = 'test';

      (groupService.findAll as jest.Mock).mockResolvedValue(mockGroups);

      const result = await controller.getGroups(sortDto, paginationDto, searchQuery);

      expect(groupService.findAll as jest.Mock).toHaveBeenCalledWith(sortDto, paginationDto, searchQuery);
      expect(result).toEqual(mockResponse);
    });
  });
});
