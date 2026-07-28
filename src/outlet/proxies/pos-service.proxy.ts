import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { IInternalApiConfig } from 'config/interface';
import { SaveOutletPOSConfigDto } from '../dtos/create-pos-config-dto';
import { EnvKeysEnum } from 'config/env.enum';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

@Injectable()
export class PosServiceProxy {
  private readonly posServiceUrl: string;
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: CustomPinoLogger
  ) {
    const { POS_SERVICE_URL } = this.configService.get<IInternalApiConfig>('internal-apis');
    this.posServiceUrl = POS_SERVICE_URL;
  }

  async addPosConfig(body: SaveOutletPOSConfigDto, outletId: string, headers: Record<string, string>) {
    try {
      const safeOutletId = encodeURIComponent(outletId);
      body['authCode'] = process.env[EnvKeysEnum.POS_AUTH_CODE];
      const url = `${this.posServiceUrl}/outlets/${safeOutletId}/pos-config`;
      return await axios.post(url, body, {
        headers: {
          'Authorization': headers['authorization'] ?? null,
          'x-device-id': headers['x-device-id'] ?? null,
        },
      });
    } catch (error) {
      this.logger.error(`PosServiceProxy.addPosConfig error`, { error });
      throw new HttpException(
        error?.response?.data?.message || error?.response?.data || 'POS config not updated',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getPosConfig(outletId: string, headers: Record<string, string>) {
    try {
      const safeOutletId = encodeURIComponent(outletId);
      const url = `${this.posServiceUrl}/outlets/${safeOutletId}/pos-config`;
      return await axios.get(url, {
        headers: {
          'Authorization': headers['authorization'] ?? null,
          'x-device-id': headers['x-device-id'] ?? null,
        },
      });
    } catch (error) {
      this.logger.error(`PosServiceProxy.getPosConfig error`, { error });
      throw new HttpException(
        error?.response?.data?.message || error?.response?.data || 'Error in getting POS config',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
