import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { MerchantGroupProxy } from '../merchant-group.proxy';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MerchantGroupProxy', () => {
  let service: MerchantGroupProxy;
  let configService: ConfigService;
  let logger: CustomPinoLogger;

  const mockLogger = {
    error: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue({
      GET_MERCHANT_GROUPS_URL: 'https://mocked-url.com/merchant-groups',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantGroupProxy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CustomPinoLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<MerchantGroupProxy>(MerchantGroupProxy);
    configService = module.get<ConfigService>(ConfigService);
    logger = module.get<CustomPinoLogger>(CustomPinoLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call axios.post and return response on success', async () => {
    const merchantIds = ['m1', 'm2'];
    const mockResponse = { data: ['group1', 'group2'] };

    mockedAxios.post.mockResolvedValueOnce(mockResponse);

    const result = await service.getMerchantGroups(merchantIds);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://mocked-url.com/merchant-groups',
      merchantIds,
    );
    expect(result).toEqual(mockResponse);
  });

  it('should throw HttpException and log error when axios throws with response', async () => {
    const merchantIds = ['m1'];
    const error = {
      response: {
        data: {
          message: 'Failed to fetch',
        },
        status: 400,
      },
    };

    mockedAxios.post.mockRejectedValueOnce(error);

    await expect(service.getMerchantGroups(merchantIds)).rejects.toThrow(
      new HttpException('Failed to fetch', 400),
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      'MerchantGroupProxy.getMerchantGroups method error',
      { error },
    );
  });

  it('should throw HttpException with generic message if response data has no message', async () => {
    const merchantIds = ['m1'];
    const error = {
      response: {
        data: null,
        status: 500,
      },
    };

    mockedAxios.post.mockRejectedValueOnce(error);

    await expect(service.getMerchantGroups(merchantIds)).rejects.toThrow(
      new HttpException('Error in get merchant groups', 500),
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      'MerchantGroupProxy.getMerchantGroups method error',
      { error },
    );
  });

  it('should throw HttpException with INTERNAL_SERVER_ERROR if no response exists', async () => {
    const merchantIds = ['m1'];
    const error = new Error('Network Error');

    mockedAxios.post.mockRejectedValueOnce(error);

    await expect(service.getMerchantGroups(merchantIds)).rejects.toThrow(
      new HttpException('Error in get merchant groups', HttpStatus.INTERNAL_SERVER_ERROR),
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      'MerchantGroupProxy.getMerchantGroups method error',
      { error },
    );
  });
});
