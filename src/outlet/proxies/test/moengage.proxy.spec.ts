
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { MoEngageProxy } from '../moengage.proxy';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MoEngageProxy', () => {
  let moEngageProxy: MoEngageProxy;
  let mockConfigService: Partial<ConfigService>;
  let mockLogger: Partial<CustomPinoLogger>;

  const mockInternalApiConfig = {
    MOENGAGE_OUTLET_EVENT: 'OutletActive',
    MOENGAGE_OUTLET_EVENT_URL: 'https://api.moengage.com/event',
  };

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockReturnValue(mockInternalApiConfig),
    };

    mockLogger = {
      error: jest.fn(),
    };

    moEngageProxy = new MoEngageProxy(
      mockConfigService as ConfigService,
      mockLogger as CustomPinoLogger
    );
  });

  it('should be defined', () => {
    expect(moEngageProxy).toBeDefined();
  });

  it('should call axios.post with correct arguments on postOutletActive', async () => {
    const token = {
      authorization: 'Bearer test-token',
      'x-device-id': 'device-123',
    };

    const mockResponse = { data: 'success' };
    mockedAxios.post.mockResolvedValue(mockResponse);

    const result = await moEngageProxy.postOutletActive(
      'outlet123',
      'Outlet Name',
      'merchant123',
      'Merchant Name',
      token
    );

    expect(mockedAxios.post).toHaveBeenCalledWith(
      mockInternalApiConfig.MOENGAGE_OUTLET_EVENT_URL,
      {
        event: mockInternalApiConfig.MOENGAGE_OUTLET_EVENT,
        attributes: {
          outletId: 'outlet123',
          outletName: 'Outlet Name',
          merchantId: 'merchant123',
          merchantName: 'Merchant Name',
        },
      },
      {
        headers: {
          Authorization: token.authorization,
          'x-device-id': token['x-device-id'],
        },
      }
    );

    expect(result).toEqual(mockResponse);
  });

  it('should log error when axios.post throws', async () => {
    const token = {
      authorization: 'Bearer fail-token',
      'x-device-id': 'device-456',
    };

    const error = new Error('Axios failed');
    mockedAxios.post.mockRejectedValue(error);

    const result = await moEngageProxy.postOutletActive(
      'outlet456',
      'Outlet Failed',
      'merchant456',
      'Merchant Failed',
      token
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      'MoEngageProxy.postOutletActive method error',
      { error }
    );
    expect(result).toBeUndefined(); // Because the method does not rethrow
  });
});
