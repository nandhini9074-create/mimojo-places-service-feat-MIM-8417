import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OutletProducer } from 'src/kafka-services/outlet.producer';
import axios from 'axios';
import { NotFoundException } from '@nestjs/common';
import { OutletOfferProxy } from '../outlet-offer.proxy';

jest.mock('axios');
jest.mock('moment', () => {
  const actualMoment = jest.requireActual('moment');
  const mockMoment = () => ({
    utc: () => ({
      format: () => '2024-01-01T00:00:00Z',
    }),
  });
  mockMoment.utc = () => ({
    format: () => '2024-01-01T00:00:00Z',
  });
  return mockMoment;
});

describe('OutletOfferProxy', () => {
  let proxy: OutletOfferProxy;
  let configService: ConfigService;
  let outletProducer: OutletProducer;

  const mockConfigService = {
    get: jest.fn().mockReturnValue({
      ALL_OUTLETS_OFFERS_OF_MERCHANT: 'https://fake-url.com/merchant/:merchantId/offers',
      ALL_OFFERS_OF_OUTLET: 'https://fake-url.com/outlet/:id/profile/:profileid/offers',
      OUTLET_SCHEDULED_OFFER: 'https://fake-url.com/outlet/:id/scheduled',
      CREATE_OUTLET_DEFAULT_OFFER: 'https://fake-url.com/create-offer',
      MIMOJO_PROFILE_ID: 'test-profile-id',
      OFFER_URL: 'https://test-offer-service.com',
    }),
  };

  const mockOutletProducer = {
    pushToKafka: jest.fn(),
  };

  const token = {
    'authorization': '<mock-auth>',
    'x-device-id': 'device-123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutletOfferProxy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: OutletProducer, useValue: mockOutletProducer },
      ],
    }).compile();

    proxy = module.get<OutletOfferProxy>(OutletOfferProxy);
    configService = module.get<ConfigService>(ConfigService);
    outletProducer = module.get<OutletProducer>(OutletProducer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllOutletOffersByMerchantId', () => {
    it('should return offers for merchant', async () => {
      const response = { data: 'offers' };
      (axios.get as jest.Mock).mockResolvedValue(response);

      const result = await proxy.getAllOutletOffersByMerchantId('123', token);

      expect(axios.get).toHaveBeenCalledWith('https://fake-url.com/merchant/123/offers', {
        headers: {
          'Authorization': token.authorization,
          'x-device-id': token['x-device-id'],
        },
      });
      expect(result).toBe(response);
    });

    it('should throw NotFoundException if request fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('fail'));

      await expect(proxy.getAllOutletOffersByMerchantId('123', token)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getOutletAllOffers', () => {
    it('should return all offers for outlet', async () => {
      const response = { data: 'outlet-offers' };
      (axios.get as jest.Mock).mockResolvedValue(response);

      const result = await proxy.getOutletAllOffers('456', token);

      expect(axios.get).toHaveBeenCalledWith('https://fake-url.com/outlet/456/profile/test-profile-id/offers', {
        headers: {
          'Authorization': token.authorization,
          'x-device-id': token['x-device-id'],
        },
        params: {
          transactionDate: '2024-01-01T00:00:00Z',
        },
      });
      expect(result).toBe(response);
    });

    it('should silently fail and return undefined on error', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('fail'));

      const result = await proxy.getOutletAllOffers('456', token);
      expect(result).toBeUndefined();
    });
  });

  describe('getOutletScheduledOffer', () => {
    it('should return scheduled offer for outlet', async () => {
      const response = { data: 'scheduled-offer' };
      (axios.get as jest.Mock).mockResolvedValue(response);

      const result = await proxy.getOutletScheduledOffer('789');

      expect(axios.get).toHaveBeenCalledWith('https://fake-url.com/outlet/789/scheduled');
      expect(result).toBe(response);
    });
  });

  describe('createOutletDefaultOffers', () => {
    it('should push data to Kafka', () => {
      const headers = {
        'authorization': 'Bearer xyz',
        'x-device-id': 'device-abc',
      };

      process.env['KAFKA_OUTLET_OFFER_TOPIC'] = 'test-topic';

      proxy.createOutletDefaultOffers('1', '2', 'Outlet Name', 'user-1');

      expect(outletProducer.pushToKafka).toHaveBeenCalledWith(
        '2',
        {
          merchantId: '1',
          outletId: '2',
          outletName: 'Outlet Name',
          updatedBy: 'user-1',
        },
        'test-topic',
        'false'
      );
    });
  });

  it('should call axios.post with correct URL', async () => {
    const outletId = 'outlet-123';
    const profileId = 'profile-456';
    const mockResponse = { data: { offer: 'test-offer' } };

    (axios.post as jest.Mock).mockResolvedValue(mockResponse);

    await proxy.getOutletCurrentOfferForProfile(outletId, profileId);

    expect(axios.post as jest.Mock).toHaveBeenCalledWith(
      `https://test-offer-service.com/offersv2/current/outlet/${outletId}/${profileId}`
    );
  });

  it('should throw error if axios.post rejects', async () => {
    const outletId = 'outlet-123';
    const profileId = 'profile-456';
    const error = new Error('Network error');

    (axios.post as jest.Mock).mockRejectedValue(error);

    await expect(proxy.getOutletCurrentOfferForProfile(outletId, profileId)).rejects.toThrow(error);
  });
});
