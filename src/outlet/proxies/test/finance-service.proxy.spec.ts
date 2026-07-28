import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { FinanceServiceProxy } from '../finance-service.proxy';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FinanceServiceProxy', () => {
  let service: FinanceServiceProxy;

  const mockConfigService = {
    get: jest.fn().mockReturnValue({
      FINANCE_SERVICE_URL: 'https://mock-finance-service',
    }),
  };

  const mockToken = {
    authorization: '<mock-auth>',
    'x-device-id': 'device-123',
  };

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceServiceProxy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CustomPinoLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<FinanceServiceProxy>(FinanceServiceProxy);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call axios.post with correct payload and headers and log start/end', async () => {
    const outletId = 'outlet-1';
    const outletName = 'Outlet Name';
    const categoryIds = ['cat-1'];
    const city = 'Test City';
    const outletNo = '123';
    const paymentPlan = 'monthly';
    const currencyId = 'currency-1';

    const expectedPayload = {
      id: outletId,
      customerNo: outletNo,
      name: outletName,
      categories: categoryIds,
      subCategories: [],
      paymentGroup: paymentPlan,
      customerRegion: city,
      currencyId: currencyId,
    };

    mockedAxios.post.mockResolvedValueOnce({ data: 'success' });

    const res = await service.syncNewOutlet(
      outletId,
      outletName,
      categoryIds,
      city,
      outletNo,
      paymentPlan,
      mockToken,
      currencyId,
    );

    expect(mockLogger.info).toHaveBeenCalledWith(
      'FinanceServiceProxy.syncNewOutlet - start',
      { outletId, outletName, city },
    );

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://mock-finance-service',
      expectedPayload,
      {
        headers: {
          Authorization: mockToken.authorization,
          'x-device-id': mockToken['x-device-id'],
        },
      },
    );

    expect(mockLogger.info).toHaveBeenCalledWith(
      'FinanceServiceProxy.syncNewOutlet - end',
      { response: { data: 'success' } },
    );

    expect(res.data).toBe('success');
  });

  it('should handle missing headers gracefully and still log start/end', async () => {
    const token = {};
    mockedAxios.post.mockResolvedValueOnce({ data: 'ok' });

    const res = await service.syncNewOutlet(
      'outlet-2',
      'Name',
      [],
      'City',
      '123',
      'basic',
      token,
      'INR',
    );

    expect(mockLogger.info).toHaveBeenCalledWith(
      'FinanceServiceProxy.syncNewOutlet - start',
      expect.objectContaining({ outletId: 'outlet-2', outletName: 'Name', city: 'City' }),
    );

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://mock-finance-service',
      expect.any(Object),
      {
        headers: {
          Authorization: undefined,
          'x-device-id': undefined,
        },
      },
    );

    expect(mockLogger.info).toHaveBeenCalledWith(
      'FinanceServiceProxy.syncNewOutlet - end',
      { response: { data: 'ok' } },
    );

    expect(res.data).toBe('ok');
  });

  it('should catch and log errors (no throw)', async () => {
    const error = new Error('Post failed');
    mockedAxios.post.mockRejectedValueOnce(error);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const result = await service.syncNewOutlet(
      'outlet-3',
      'Outlet',
      [],
      'City',
      '123',
      'plan',
      mockToken,
      'USD',
    );

    expect(consoleSpy).toHaveBeenCalledWith(error);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'FinanceServiceProxy.syncNewOutlet - exception',
      expect.objectContaining({
        error,
        outletId: 'outlet-3',
        outletName: 'Outlet',
        city: 'City',
      }),
    );
    expect(result).toBeUndefined();

    consoleSpy.mockRestore();
  });
});
