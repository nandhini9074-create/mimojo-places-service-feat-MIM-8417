import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { OfferServiceProxy } from '../offer-service.proxy';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

jest.mock('config/server.config', () => ({
    internalApisConfig: () => ({
        GRAVITEE_URL: 'https://fake-gravitee',
    }),
}));
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OfferServiceProxy', () => {
  let service: OfferServiceProxy;
  let loggerMock: { info: jest.Mock; error: jest.Mock };

  beforeEach(async () => {
    loggerMock = {
      info: jest.fn(),
      error: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfferServiceProxy,
        {
          provide: CustomPinoLogger,
          useValue: loggerMock
        }
      ]
    }).compile();

    service = module.get<OfferServiceProxy>(OfferServiceProxy);
  });

  it('should return true when API responds with data.data = true', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: true } });

    const result = await service.checkMerchantHasActiveOffer('merchant-123', 'Bearer token');

    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('/offersv2/merchant/current/merchant-123/check'),
      { headers: { Authorization: 'Bearer token' } }
    );
    expect(loggerMock.info).toHaveBeenCalledWith(
      expect.stringContaining(
        'OfferServiceProxy.checkMerchantHasActiveOffer - response; merchantId: merchant-123'
      ),
      expect.objectContaining({
        returnData: true,
        url: expect.any(String)
      })
    );
    expect(result).toBe(true);
  });

  it('should return false when API responds with data.data = false', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: false } });

    const result = await service.checkMerchantHasActiveOffer('merchant-123', 'Bearer token');

    expect(result).toBe(false);
  });

  it('should return false and log error when API throws', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

    const result = await service.checkMerchantHasActiveOffer('merchant-123', 'Bearer token');

    expect(result).toBe(false);
    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.stringContaining(
        'OfferServiceProxy.checkMerchantHasActiveOffer - exception; merchantId: merchant-123'
      ),
      expect.objectContaining({
        url: expect.any(String),
        error: expect.any(Error)
      })
    );
  });
});
