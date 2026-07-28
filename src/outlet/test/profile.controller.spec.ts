import { Test, TestingModule } from '@nestjs/testing';
import { baseResponseHelper } from 'src/helpers/base-response.helper';
import { SortDto } from 'src/common/dtos/sort.dto';
import { PaginationDto } from 'src/common/dtos/pagenation.dto';
import { ProfileController } from '../profile.controller';
import { ProfileService } from '../services/profile.service';

jest.mock('src/helpers/base-response.helper');

describe('ProfileController', () => {
  let controller: ProfileController;
  let service: ProfileService;

  const mockProfileService = {
    getAllProfiles: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        {
          provide: ProfileService,
          useValue: mockProfileService,
        },
      ],
    }).compile();

    controller = module.get<ProfileController>(ProfileController);
    service = module.get<ProfileService>(ProfileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return all profiles with query params and wrap in baseResponseHelper', async () => {
    const sortDto: SortDto = { sort: ['createdAt,DESC'] };
    const paginationDto: PaginationDto = { page: 2, limit: 10 };
    const searchQuery = 'test search';

    const profilesResponse = [{ id: '1', name: 'Test' }];
    const expectedResponse = { status: 'ok', data: profilesResponse };

    mockProfileService.getAllProfiles.mockResolvedValue(profilesResponse);
    (baseResponseHelper as jest.Mock).mockReturnValue(expectedResponse);

    const result = await controller.getAllProfiles(sortDto, paginationDto, searchQuery);

    expect(service.getAllProfiles).toHaveBeenCalledWith(sortDto, paginationDto, searchQuery);
    expect(baseResponseHelper).toHaveBeenCalledWith(profilesResponse);
    expect(result).toEqual(expectedResponse);
  });

  it('should handle missing optional parameters', async () => {
    const profilesResponse = [{ id: '1', name: 'Fallback' }];
    const expectedResponse = { status: 'ok', data: profilesResponse };

    mockProfileService.getAllProfiles.mockResolvedValue(profilesResponse);
    (baseResponseHelper as jest.Mock).mockReturnValue(expectedResponse);

    const result = await controller.getAllProfiles(undefined, undefined, undefined);

    expect(service.getAllProfiles).toHaveBeenCalledWith(undefined, undefined, undefined);
    expect(result).toEqual(expectedResponse);
  });

  it('should throw if service throws an error', async () => {
    const error = new Error('Something went wrong');
    mockProfileService.getAllProfiles.mockRejectedValue(error);

    await expect(controller.getAllProfiles(undefined, undefined, undefined)).rejects.toThrow('Something went wrong');
  });
});
