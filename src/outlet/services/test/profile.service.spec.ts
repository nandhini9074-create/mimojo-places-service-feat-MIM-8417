import { HttpException } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { TestingModule, Test } from '@nestjs/testing';
import { ProfileService } from '../profile.service';
import { Profile } from 'src/outlet/models/profile.model';
import { buildQueryOptions } from 'src/common/helpers/query-utils';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';
import { Op } from 'sequelize';
jest.mock('src/common/helpers/query-utils');
const mockProfileModel = {
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
};

describe('ProfileService', () => {
  let service: ProfileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: getModelToken(Profile), useValue: mockProfileModel },
        { provide: CustomPinoLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should create a profile', async () => {
    mockProfileModel.create.mockResolvedValue('profile');
    const result = await service.create({} as any);
    expect(result).toBe('profile');
  });

  it('should throw if create fails with unique constraint', async () => {
    mockProfileModel.create.mockRejectedValue({ name: 'SequelizeUniqueConstraintError' });
    await expect(service.create({} as any)).rejects.toThrow(HttpException);
  });

  it('should update a profile', async () => {
    mockProfileModel.update.mockResolvedValue(['count', [{}]]);
    const result = await service.updateById({ profileId: '1' } as any);
    expect(result).toEqual(['count', [{}]]);
  });

  it('should throw if update fails', async () => {
    mockProfileModel.update.mockRejectedValue(new Error('update error'));
    await expect(service.updateById({ profileId: '1' } as any)).rejects.toThrow(HttpException);
  });

  it('should delete a profile', async () => {
    mockProfileModel.destroy.mockResolvedValue(1);
    const result = await service.deleteByProfileId('1');
    expect(result).toBe(1);
  });

  it('should throw if delete fails', async () => {
    mockProfileModel.destroy.mockRejectedValue(new Error('delete error'));
    await expect(service.deleteByProfileId('1')).rejects.toThrow(HttpException);
  });

  it('should find all profiles', async () => {
    mockProfileModel.findAll.mockResolvedValue(['profile1', 'profile2']);
    const result = await service.findAll();
    expect(result).toEqual(['profile1', 'profile2']);
  });

  it('should find a profile by id', async () => {
    mockProfileModel.findOne.mockResolvedValue({ id: '1' });
    const result = await service.findOne('1');
    expect(result).toEqual({ id: '1' });
  });

  it('should find a profile by name', async () => {
    mockProfileModel.findOne.mockResolvedValue({ name: 'Test' });
    const result = await service.findByName('Test');
    expect(result).toEqual({ name: 'Test' });
  });

  describe('ProfileService - Error Handling', () => {
    describe('create - SequelizeUniqueConstraintError', () => {
      it('should log error and throw HttpException for duplicate profile', async () => {
        const error = { name: 'SequelizeUniqueConstraintError' };
        mockProfileModel.create.mockRejectedValue(error);

        await expect(service.create({} as any)).rejects.toThrow(HttpException);
        expect(mockLogger.error).toHaveBeenCalledWith('ProfileService.create method error', { error });
      });
    });

    describe('create - other error', () => {
      it('should log and throw default HttpException', async () => {
        const error = { name: 'SomeOtherError' };
        mockProfileModel.create.mockRejectedValue(error);

        await expect(service.create({} as any)).rejects.toThrow(HttpException);
        expect(mockLogger.error).toHaveBeenCalledWith('ProfileService.create method error', { error });
      });
    });

    describe('updateById', () => {
      it('should log and throw HttpException on update error', async () => {
        const error = new Error('Update failed');
        mockProfileModel.update.mockRejectedValue(error);

        await expect(service.updateById({ profileId: '1' } as any)).rejects.toThrow(HttpException);
        expect(mockLogger.error).toHaveBeenCalledWith('ProfileService.update method error', { error });
      });
    });

    describe('deleteByProfileId', () => {
      it('should log and throw HttpException on delete error', async () => {
        const error = new Error('Delete failed');
        mockProfileModel.destroy.mockRejectedValue(error);

        await expect(service.deleteByProfileId('123')).rejects.toThrow(HttpException);
        expect(mockLogger.error).toHaveBeenCalledWith('ProfileService.delete method error', { error });
      });
    });

    describe('findAll', () => {
      it('should log error on failure', async () => {
        const error = new Error('DB error');
        mockProfileModel.findAll.mockRejectedValue(error);

        await service.findAll();
        expect(mockLogger.error).toHaveBeenCalledWith('ProfileService.findAll method error', { error });
      });
    });

    describe('findOne', () => {
      it('should log error on failure', async () => {
        const error = new Error('DB error');
        mockProfileModel.findOne.mockRejectedValue(error);

        await service.findOne('abc');
        expect(mockLogger.error).toHaveBeenCalledWith('ProfileService.findOne method error', { error });
      });
    });

    describe('findByName', () => {
      it('should log error on failure', async () => {
        const error = new Error('DB error');
        mockProfileModel.findOne.mockRejectedValue(error);

        await service.findByName('name');
        expect(mockLogger.error).toHaveBeenCalledWith('ProfileService.findByName method error', { error });
      });
    });
  });
  describe('getAllProfiles', () => {
    const mockProfiles = [{ id: '1', name: 'John Doe' }];
    it('should return all profiles with valid DTOs', async () => {
      const paginationDto = { page: 1, limit: 10 };
      const sortDto = { sort: ['createdAt,DESC'] };
      const searchQuery = 'john';

      const queryOptions = { where: {}, limit: 10, offset: 0, order: [['createdAt', 'DESC']] };

      (buildQueryOptions as jest.Mock).mockReturnValue(queryOptions);
      mockProfileModel.findAll.mockResolvedValue(mockProfiles);

      const result = await service.getAllProfiles(sortDto, paginationDto, searchQuery);

      expect(buildQueryOptions).toHaveBeenCalledWith({ paginationDto, sortDto, searchQuery });
      expect(mockProfileModel.findAll).toHaveBeenCalledWith(queryOptions);
      expect(result).toEqual(mockProfiles);
    });

    it('should return profiles when optional parameters are undefined', async () => {
      (buildQueryOptions as jest.Mock).mockReturnValue({});
      mockProfileModel.findAll.mockResolvedValue(mockProfiles);

      const result = await service.getAllProfiles(undefined, undefined, undefined);

      expect(buildQueryOptions).toHaveBeenCalledWith({
        paginationDto: undefined,
        sortDto: undefined,
        searchQuery: undefined,
      });
      expect(mockProfileModel.findAll).toHaveBeenCalledWith({});
      expect(result).toEqual(mockProfiles);
    });

    it('should handle searchQuery only', async () => {
      const searchQuery = 'john';
      const queryOptions = { where: { name: { $like: `%john%` } } };

      (buildQueryOptions as jest.Mock).mockReturnValue(queryOptions);
      mockProfileModel.findAll.mockResolvedValue(mockProfiles);

      const result = await service.getAllProfiles(undefined, undefined, searchQuery);

      expect(buildQueryOptions).toHaveBeenCalledWith({ paginationDto: undefined, sortDto: undefined, searchQuery });
      expect(mockProfileModel.findAll).toHaveBeenCalledWith(queryOptions);
      expect(result).toEqual(mockProfiles);
    });

    it('should handle pagination only', async () => {
      const paginationDto = { page: 2, limit: 5 };
      const queryOptions = { offset: 5, limit: 5 };

      (buildQueryOptions as jest.Mock).mockReturnValue(queryOptions);
      mockProfileModel.findAll.mockResolvedValue(mockProfiles);

      const result = await service.getAllProfiles(undefined, paginationDto, undefined);

      expect(buildQueryOptions).toHaveBeenCalledWith({ paginationDto, sortDto: undefined, searchQuery: undefined });
      expect(mockProfileModel.findAll).toHaveBeenCalledWith(queryOptions);
      expect(result).toEqual(mockProfiles);
    });

    it('should log and return undefined on error', async () => {
      const error = new Error('DB failed');
      mockProfileModel.findAll.mockRejectedValue(error);

      const loggerErrorSpy = jest.spyOn(service['logger'], 'error');

      const result = await service.getAllProfiles();

      expect(loggerErrorSpy).toHaveBeenCalledWith('ProfileService.getAllProfiles error', { error });
      expect(result).toBeUndefined();
    });
  });

  describe('findByNames', () => {
    it('should return profiles for given names', async () => {
      const mockProfiles = [{ id: 1 }, { id: 2 }];
      mockProfileModel.findAll.mockResolvedValue(mockProfiles);

      const result = await service.findByNames(['profile1', 'profile2']);

      expect(mockProfileModel.findAll).toHaveBeenCalledWith({
        where: { name: { [Op.in]: ['profile1', 'profile2'] } },
        attributes: ['id'],
        raw: true,
      });
      expect(result).toEqual(mockProfiles);
      expect(mockLogger.info).toHaveBeenCalledWith('ProfileService.findByName method called', {
        profileNames: ['profile1', 'profile2'],
      });
    });

    it('should log error if findAll throws', async () => {
      const mockError = new Error('Database error');
      mockProfileModel.findAll.mockRejectedValue(mockError);

      const result = await service.findByNames(['profile1']);

      expect(mockLogger.error).toHaveBeenCalledWith('ProfileService.findByName method error', { error: mockError });
      expect(result).toBeUndefined();
    });
  });

  describe('getPaydayProfiles', () => {
    it('should return active payday profiles', async () => {
      const profiles = [{ id: 'p1', name: 'Payday' }];
      mockProfileModel.findAll.mockResolvedValue(profiles);

      const result = await service.getPaydayProfiles();

      expect(mockProfileModel.findAll).toHaveBeenCalledWith({
        where: { allowPayday: true, isActive: true },
        attributes: ['id', 'name'],
        order: [['createdAt', 'DESC']],
      });
      expect(result).toEqual(profiles);
    });

    it('should log and return undefined when getPaydayProfiles fails', async () => {
      const error = new Error('payday fail');
      mockProfileModel.findAll.mockRejectedValue(error);
      const result = await service.getPaydayProfiles();
      expect(result).toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalledWith('ProfileService.getPaydayProfiles error', { error });
    });
  });
});
