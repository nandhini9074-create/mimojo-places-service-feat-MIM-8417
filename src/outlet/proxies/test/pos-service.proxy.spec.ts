import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { HttpException } from '@nestjs/common';
import { PosServiceProxy } from '../pos-service.proxy';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PosServiceProxy', () => {
  let service: PosServiceProxy;
  let configService: ConfigService;
  let logger: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PosServiceProxy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({ POS_SERVICE_URL: 'http://pos-service.com' })
          }
        },
        {
          provide: CustomPinoLogger,
          useValue: { error: jest.fn(), log: jest.fn() },
        }
      ]
    }).compile();

    service = module.get<PosServiceProxy>(PosServiceProxy);
    configService = module.get<ConfigService>(ConfigService);
    logger = module.get<CustomPinoLogger>(CustomPinoLogger);
  });

  describe('addPosConfig', () => {
    it('should post config successfully', async () => {
      const body: any = { key: 'value' };
      const outletId = '123';
      const headers = { authorization: 'auth', 'x-device-id': 'device' };
      const response = { data: 'success' };
      mockedAxios.post.mockResolvedValueOnce(response);

      const result = await service.addPosConfig(body, outletId, headers);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://pos-service.com/outlets/123/pos-config',
        expect.objectContaining({ authCode: process.env['POS_AUTH_CODE'] }),
        expect.objectContaining({ headers: expect.any(Object) })
      );
      expect(result.data).toBe('success');
    });

    it('should handle error during post', async () => {
      const body: any = {};
      const outletId = '123';
      const headers = { authorization: 'auth', 'x-device-id': 'device' };
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: { message: 'fail' },
          status: 400,
        }
      });

      await expect(service.addPosConfig(body, outletId, headers)).rejects.toThrow(HttpException);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getPosConfig', () => {
    it('should get config successfully', async () => {
      const outletId = '123';
      const headers = { authorization: 'auth', 'x-device-id': 'device' };
      const response = { data: 'config' };
      mockedAxios.get.mockResolvedValueOnce(response);

      const result = await service.getPosConfig(outletId, headers);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://pos-service.com/outlets/123/pos-config',
        expect.objectContaining({
          headers: {
            Authorization: 'auth',
            'x-device-id': 'device',
          },
        })
      );      
      expect(result).toEqual(response);
    });

    it('should handle error during get', async () => {
      const outletId = '123';
      const headers = { authorization: 'auth', 'x-device-id': 'device' };
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          data: { message: 'error' },
          status: 500
        }
      });

      await expect(service.getPosConfig(outletId, headers)).rejects.toThrow(HttpException);
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
