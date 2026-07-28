import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { FastPaymentServiceProxy } from '../fast-payment-service.proxy';
import { OutletFastPaymentStatusDto } from 'src/outlet/dtos/fast-payment-status.dto';
import { OutletFastPaymentStatusEnum } from 'src/outlet/enums/outlet-status-enum';
import { PaymentMethods } from 'src/outlet/enums/payment-methods-enum';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FastPaymentServiceProxy - Coverage Boost', () => {
  let service: FastPaymentServiceProxy;

  const mockConfigService = {
    get: jest.fn().mockReturnValue({
      FAST_PAYMENT_SERVICE_URL: 'http://mock-url',
    }),
  };

  const mockLogger = {
    error: jest.fn(),
    info: jest.fn(),
  };

  const fullHeaders = {
    'authorization': '<mock-auth>',
    'x-device-id': 'device-123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FastPaymentServiceProxy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CustomPinoLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<FastPaymentServiceProxy>(FastPaymentServiceProxy);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upsertFastPaymentStatus', () => {
    const dto = { merchantId: 'm1', outletId: 'o1' } as any;

    it('should work with full headers', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: 'ok' });
      const result = await service.upsertFastPaymentStatus(dto, fullHeaders);
      expect(result).toBe('ok');
    });

    it('should handle missing headers gracefully (null fallback)', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: 'ok' });
      await service.upsertFastPaymentStatus(dto, {});
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        dto,
        expect.objectContaining({
          headers: { 'Authorization': null, 'x-device-id': null },
        })
      );
    });

    it('should fallback to default message on error', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: { data: null },
      });
      await expect(service.upsertFastPaymentStatus(dto, fullHeaders)).rejects.toThrow('Fast payment status not updated');
    });

    it('should log error and throw default message if axios fails', async () => {
      const err = new Error('network failure');
      mockedAxios.post.mockRejectedValueOnce(err);
      let data: OutletFastPaymentStatusDto = {
        merchantId: 'm1',
        outletId: 'o1',
        name: '',
        status: OutletFastPaymentStatusEnum['NOT ENROLLED'],
      };
      await expect(service.upsertFastPaymentStatus(data, fullHeaders)).rejects.toThrow('Fast payment status not updated');

      expect(mockLogger.error).toHaveBeenCalledWith(
        `FastPaymentServiceProxy.upsertFastPaymentStatus error`,
        expect.objectContaining({
          error: expect.any(Error),
        })
      );
    });
  });

  describe('getCircleMerchantMetadata', () => {
    it('should get metadata', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: 'meta' });
      const res = await service.getCircleMerchantMetadata('m1', fullHeaders);
      expect(res.data).toBe('meta');
    });

    it('should handle error with message', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { data: { message: 'error occurred' }, status: 401 },
      });

      await expect(service.getCircleMerchantMetadata('m1', fullHeaders)).rejects.toThrow('error occurred');
    });

    it('should log error and throw response.message on failure', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { data: { message: 'custom failure' }, status: 400 },
      });

      await expect(service.getCircleMerchantMetadata('m1', fullHeaders)).rejects.toThrow('custom failure');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('addOutletTab', () => {
    it('should post tabs', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: 'ok' });
      const result = await service.addOutletTab([], 'outlet1', fullHeaders);
      expect(result.data).toBe('ok');
    });

    it('should fallback to default error message', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: { data: null },
      });

      await expect(service.addOutletTab([], 'outlet1', fullHeaders)).rejects.toThrow('Error in adding tab');
    });

    it('should log and throw if adding tab fails', async () => {
      mockedAxios.post.mockRejectedValueOnce({ response: { data: null } });

      await expect(service.addOutletTab([], 'outlet1', fullHeaders)).rejects.toThrow('Error in adding tab');

      expect.stringContaining('FastPaymentServiceProxy.addOutletTab error');
    });
  });

  describe('getOutletTabs', () => {
    it('should return tabs', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: ['tab'] });
      const res = await service.getOutletTabs('outlet1', fullHeaders);
      expect(res.data).toEqual(['tab']);
    });

    it('should handle missing response.message', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { data: { error: 'Some error' } },
      });
      await expect(service.getOutletTabs('outlet1', fullHeaders)).rejects.toThrow();
    });

    it('should log and throw if getOutletTabs fails without message', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { data: { error: 'Something went wrong' } },
      });

      await expect(service.getOutletTabs('outlet1', fullHeaders)).rejects.toThrow();
      expect.stringContaining('FastPaymentServiceProxy.getOutletTabs error');
    });
  });

  describe('addOutletConfig', () => {
    it('should work', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: 'ok' });
      const res = await service.addOutletConfig(
        {
          countryName: '',
          cityName: '',
          redirectBaseURL: '',
          menuLink: '',
          hasInroomDining: false,
          disabledPaymentMethods: PaymentMethods.PAY_FULL,
        },
        'outlet1',
        fullHeaders
      );
      expect(res.data).toBe('ok');
    });

    it('should fallback to default message', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: { data: null },
      });
      await expect(
        service.addOutletConfig(
          {
            countryName: '',
            cityName: '',
            redirectBaseURL: '',
            menuLink: '',
            hasInroomDining: false,
            disabledPaymentMethods: PaymentMethods.PAY_FULL,
          },
          'outlet1',
          fullHeaders
        )
      ).rejects.toThrow('Error in adding config');
    });

    it('should log error and throw fallback if addOutletConfig fails', async () => {
      mockedAxios.post.mockRejectedValueOnce({ response: { data: null } });

      await expect(
        service.addOutletConfig(
          {
            countryName: '',
            cityName: '',
            redirectBaseURL: '',
            menuLink: '',
            hasInroomDining: false,
            disabledPaymentMethods: PaymentMethods.PAY_FULL,
          },
          'outlet1',
          fullHeaders
        )
      ).rejects.toThrow('Error in adding config');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getOutletConfig', () => {
    it('should work', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: 'config' });
      const res = await service.getOutletConfig('outlet1', fullHeaders);
      expect(res.data).toBe('config');
    });
    it('should log error and throw default message if getOutletConfig fails', async () => {
      const error = { response: { data: null, status: 500 } };
      mockedAxios.get.mockRejectedValueOnce(error);

      await expect(service.getOutletConfig('outlet-1', fullHeaders)).rejects.toThrow('Error in getting config');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'FastPaymentServiceProxy.getOutletConfig error',
        expect.objectContaining({
          error,
        })
      );
    });
  });

  describe('addOutletPriceConfig', () => {
    it('should work', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: 'ok' });
      const res = await service.addOutletPriceConfig(
        {
          merchantTransactionFeePercentage: 0,
          suggestedTipPercentage: 0,
          maximumTipPercentage: 0,
          fastPaymentChargesPercentage: 0,
          inclusiveServiceChargePercentage: 0,
          inclusiveVatPercentage: 0,
          inclusiveMunicipalityFeePercentage: 0,
          inclusivePriceInfo: '',
          tipNote: '',
          paymentSplitId: [],
        },
        'outlet1',
        fullHeaders
      );
      expect(res.data).toBe('ok');
    });

    it('should log error and throw default message if addOutletPriceConfig fails', async () => {
      const error = { response: { data: null, status: 500 } };
      mockedAxios.post.mockRejectedValueOnce(error);

      await expect(service.addOutletPriceConfig({} as any, 'outlet-1', fullHeaders)).rejects.toThrow(
        'Error in adding price config'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'FastPaymentServiceProxy.addOutletPriceConfig error',
        expect.objectContaining({
          error,
        })
      );
    });
  });

  describe('getOutletPriceConfig', () => {
    it('should work', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: 'price' });
      const res = await service.getOutletPriceConfig('outlet1', fullHeaders);
      expect(res.data).toBe('price');
    });

    it('should log error and throw default message if getOutletPriceConfig fails', async () => {
      const error = { response: { data: null, status: 500 } };
      mockedAxios.get.mockRejectedValueOnce(error);

      await expect(service.getOutletPriceConfig('outlet-1', fullHeaders)).rejects.toThrow('Error in getting price config');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'FastPaymentServiceProxy.getOutletPriceConfig error',
        expect.objectContaining({
          error,
        })
      );
    });
  });

  describe('updateOutlet', () => {
    it('should work', async () => {
      mockedAxios.patch.mockResolvedValueOnce({ data: 'updated' });
      const res = await service.updateOutlet('outlet1', {}, fullHeaders);
      expect(res).toBe('updated');
    });

    it('should fallback to error message', async () => {
      mockedAxios.patch.mockRejectedValueOnce({
        response: { data: null },
      });
      await expect(service.updateOutlet('outlet1', {}, fullHeaders)).rejects.toThrow('Outlet in fast payment not updated');
    });

    it('should log and throw error if updateOutlet fails', async () => {
      mockedAxios.patch.mockRejectedValueOnce({ response: { data: null } });

      await expect(service.updateOutlet('outlet1', {}, fullHeaders)).rejects.toThrow('Outlet in fast payment not updated');
      expect.stringContaining('FastPaymentServiceProxy.updateOutlet error');
    });
  });

  describe('getOutlet', () => {
    it('should work', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: 'outlet' });
      const res = await service.getOutlet('outlet1', fullHeaders);
      expect(res.data).toBe('outlet');
    });

    it('should log error and throw default message if getOutlet fails', async () => {
      const error = { response: { data: null, status: 500 } };
      mockedAxios.get.mockRejectedValueOnce(error);

      await expect(service.getOutlet('outlet-1', fullHeaders)).rejects.toThrow('Error in getting outlet details');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'FastPaymentServiceProxy.getOutlet error',
        expect.objectContaining({
          error,
        })
      );
    });
  });
});
