import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CoreMerchantOutletProxy } from '../core-merchant-outlet.proxy';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CoreMerchantOutletProxy', () => {
  let service: CoreMerchantOutletProxy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoreMerchantOutletProxy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              CORE_UPDATE_OUTLET: 'http://core.test/update-outlet',
              MANAGEMENT_REPORTING_OUTLET_URL: 'http://reporting.test/update-outlet',
            }),
          },
        },
        {
          provide: CustomPinoLogger,
          useValue: { info: jest.fn(), error: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CoreMerchantOutletProxy>(CoreMerchantOutletProxy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockPayload = {
    outletId: 'outlet123',
    merchantId: 'merchant123',
    merchantName: 'Test Merchant',
    outletName: 'Test Outlet',
    merchantLogo: 'merchant-logo.png',
    categoryLogo: 'category-logo.png',
    categoryId: 1,
    categoryName: 'Food',
    country: 'UAE',
    city: 'Dubai',
    merchantNo: 'M0001',
    outletNo: 'O0001',
    token: {
      'authorization': '<mock-auth>123',
      'x-device-id': 'device123',
    },
    location: '25.276987,55.296249',
    merchantNameAr: 'تاجر',
    outletNameAr: 'فرع',
  };

  it('should call both endpoints successfully and return core API response', async () => {
    const mockReportingResponse = { data: { success: true } };
    const mockCoreResponse = { data: { updated: true } };

    mockedAxios.post.mockResolvedValueOnce(mockReportingResponse).mockResolvedValueOnce(mockCoreResponse);

    const result = await service.updateOutletInCore(
      mockPayload.outletId,
      mockPayload.merchantId,
      mockPayload.merchantName,
      mockPayload.outletName,
      mockPayload.merchantLogo,
      mockPayload.categoryLogo,
      mockPayload.categoryId,
      mockPayload.categoryName,
      mockPayload.country,
      mockPayload.city,
      mockPayload.merchantNo,
      mockPayload.outletNo,
      mockPayload.token,
      mockPayload.location,
      mockPayload.merchantNameAr,
      mockPayload.outletNameAr
    );

    // Make sure axios.post was called twice
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);

    // Make sure the second response (from coreUpdateOutlet) is returned
    expect(result).toBe(mockCoreResponse);
  });

  it('should throw if the first axios call fails', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Reporting API failed'));

    await expect(
      service.updateOutletInCore(
        mockPayload.outletId,
        mockPayload.merchantId,
        mockPayload.merchantName,
        mockPayload.outletName,
        mockPayload.merchantLogo,
        mockPayload.categoryLogo,
        mockPayload.categoryId,
        mockPayload.categoryName,
        mockPayload.country,
        mockPayload.city,
        mockPayload.merchantNo,
        mockPayload.outletNo,
        mockPayload.token,
        mockPayload.location,
        mockPayload.merchantNameAr,
        mockPayload.outletNameAr
      )
    ).rejects.toThrow('Reporting API failed');

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });

  it('should throw if the second axios call fails', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { success: true } }).mockRejectedValueOnce(new Error('Core API failed'));

    await expect(
      service.updateOutletInCore(
        mockPayload.outletId,
        mockPayload.merchantId,
        mockPayload.merchantName,
        mockPayload.outletName,
        mockPayload.merchantLogo,
        mockPayload.categoryLogo,
        mockPayload.categoryId,
        mockPayload.categoryName,
        mockPayload.country,
        mockPayload.city,
        mockPayload.merchantNo,
        mockPayload.outletNo,
        mockPayload.token,
        mockPayload.location,
        mockPayload.merchantNameAr,
        mockPayload.outletNameAr
      )
    ).rejects.toThrow('Core API failed');

    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
  });
});
