import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { NotFoundException } from '@nestjs/common';
import { MerchantMetadataProxy } from '../merchant-metadata.proxy';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MerchantMetadataProxy', () => {
  let proxy: MerchantMetadataProxy;
  let configService: ConfigService;

  const token = {
    authorization: 'Bearer mock-token',
    'x-device-id': 'mock-device-id',
  };

  const internalApiConfigMock = {
    MERCHANT_CATEGORIES: 'https://api.test.com/merchant-category/:id',
    UPDATE_ACTIVE_INACTIVE_OUTLET_COUNT: 'https://api.test.com/merchant/:merchantId/update-count',
    MERCHANT_GET_BY_ID_URL: 'https://api.test.com/merchant/:id',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantMetadataProxy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(internalApiConfigMock),
          },
        },
      ],
    }).compile();

    proxy = module.get<MerchantMetadataProxy>(MerchantMetadataProxy);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should initialize URLs from config service', () => {
    expect(proxy['merchantCategoryUrl']).toBe(internalApiConfigMock.MERCHANT_CATEGORIES);
    expect(proxy['updateOutletCountUrl']).toBe(internalApiConfigMock.UPDATE_ACTIVE_INACTIVE_OUTLET_COUNT);
    expect(proxy['merchantGetByIdUrl']).toBe(internalApiConfigMock.MERCHANT_GET_BY_ID_URL);
  });

  describe('getMerchantMetadata', () => {
    it('should call axios.get with correct URL and headers', async () => {
      const mockResponse = { data: { category: 'Retail' } };
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await proxy.getMerchantMetadata('123', token);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.test.com/merchant-category/123',
        {
          headers: {
            Authorization: token.authorization,
            'x-device-id': token['x-device-id'],
          },
        },
      );
      expect(result).toBe(mockResponse);
    });
  });

  describe('getMerchantById', () => {
    it('should return merchant data on success', async () => {
      const mockResponse = { data: { id: '123', name: 'MerchantName' } };
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await proxy.getMerchantById('123', token);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.test.com/merchant/123',
        {
          headers: {
            Authorization: token.authorization,
            'x-device-id': token['x-device-id'],
          },
        },
      );
      expect(result).toBe(mockResponse);
    });

    it('should throw NotFoundException on error', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Not found'));

      await expect(proxy.getMerchantById('999', token)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateOutletActiveInactiveCount', () => {
    it('should update outlet count successfully', async () => {
      const mockResponse = { data: { success: true } };
      mockedAxios.patch.mockResolvedValueOnce(mockResponse);

      const result = await proxy.updateOutletActiveInactiveCount('123', 5, 2, token);

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        'https://api.test.com/merchant/123/update-count',
        {
          activeOutletsNum: 5,
          inActiveOutletsNum: 2,
        },
        {
          headers: {
            Authorization: token.authorization,
            'x-device-id': token['x-device-id'],
          },
        },
      );
      expect(result).toBe(mockResponse);
    });

    it('should throw NotFoundException on error', async () => {
      mockedAxios.patch.mockRejectedValueOnce(new Error('Update failed'));

      await expect(
        proxy.updateOutletActiveInactiveCount('123', 5, 2, token),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
