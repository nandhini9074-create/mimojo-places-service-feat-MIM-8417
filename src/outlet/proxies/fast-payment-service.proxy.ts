import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import axios from 'axios';
import { OutletFastPaymentStatusDto } from '../dtos/fast-payment-status.dto';
import { ConfigService } from '@nestjs/config';
import { IInternalApiConfig } from 'config/interface';
import {
  AddOutletConfigDto,
  AddOutletTabDto,
  AddOutletTabElementDto,
  SaveOutletPriceConfigDto,
} from '../dtos/add-outlet-dto';
import { UpdateOutletDto } from '../dtos/update-outlet-dto';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

/** Fast payment status and merchant metadata operations */
export interface IFastPaymentStatusService {
  upsertFastPaymentStatus(body: OutletFastPaymentStatusDto, headers: Record<string, string>): Promise<unknown>;
  getCircleMerchantMetadata(merchantId: string, headers: Record<string, string>): Promise<unknown>;
}

/** Fast payment outlet tab operations */
export interface IFastPaymentOutletTabService {
  addOutletTab(tabs: AddOutletTabElementDto[], outletId: string, headers: Record<string, string>): Promise<unknown>;
  getOutletTabs(outletId: string, headers: Record<string, string>): Promise<unknown>;
}

/** Fast payment outlet config operations */
export interface IFastPaymentOutletConfigService {
  addOutletConfig(body: AddOutletConfigDto, outletId: string, headers: Record<string, string>): Promise<unknown>;
  getOutletConfig(outletId: string, headers: Record<string, string>): Promise<unknown>;
}

/** Fast payment outlet price config operations */
export interface IFastPaymentOutletPriceConfigService {
  addOutletPriceConfig(body: SaveOutletPriceConfigDto, outletId: string, headers: Record<string, string>): Promise<unknown>;
  getOutletPriceConfig(outletId: string, headers: Record<string, string>): Promise<unknown>;
}

/** Fast payment outlet read/update operations */
export interface IFastPaymentOutletService {
  updateOutlet(outletId: string, body: UpdateOutletDto, headers: Record<string, string>): Promise<unknown>;
  getOutlet(outletId: string, headers: Record<string, string>): Promise<unknown>;
}

@Injectable()
export class FastPaymentServiceProxy
  implements
    IFastPaymentStatusService,
    IFastPaymentOutletTabService,
    IFastPaymentOutletConfigService,
    IFastPaymentOutletPriceConfigService,
    IFastPaymentOutletService
{
  private readonly circleMerchantUrl: string;
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: CustomPinoLogger
  ) {
    const { FAST_PAYMENT_SERVICE_URL } = this.configService.get<IInternalApiConfig>('internal-apis');
    this.circleMerchantUrl = FAST_PAYMENT_SERVICE_URL;
  }

  async upsertFastPaymentStatus(body: OutletFastPaymentStatusDto, headers: Record<string, string>) {
    this.logger.info(`FastPaymentServiceProxy.upsertFastPaymentStatus - starts`, { body, headers });
    try {
      const url = `${this.circleMerchantUrl}/merchants/${body.merchantId}/outlets/${body.outletId}/status`;
      const { data } = await axios.post(url, body, {
        headers: {
          'Authorization': headers['authorization'] ?? null,
          'x-device-id': headers['x-device-id'] ?? null,
        },
      });
      return data;
    } catch (error) {
      this.logger.error(`FastPaymentServiceProxy.upsertFastPaymentStatus error`, { error });
      throw new HttpException(
        error?.response?.data?.message || error?.response?.data || 'Fast payment status not updated',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getCircleMerchantMetadata(merchantId: string, headers: Record<string, string>) {
    this.logger.info(`FastPaymentServiceProxy.getCircleMerchantMetadata - starts`, { merchantId, headers });
    const config = {
      headers: {
        'Authorization': headers.authorization,
        'x-device-id': headers['x-device-id'],
      },
    };
    try {
      return await axios.get(`${this.circleMerchantUrl}/merchants/${merchantId}`, config);
    } catch (error) {
      this.logger.error(`FastPaymentServiceProxy.getCircleMerchantMetadata error`, { error });
      throw new HttpException(
        error?.response?.data?.message || error?.response?.data,
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async addOutletTab(tabs: AddOutletTabElementDto[], outletId: string, headers: Record<string, string>) {
    this.logger.info(`FastPaymentServiceProxy.addOutletTab - starts`, { tabs, outletId, headers });
    try {
      const body: AddOutletTabDto = {
        tabs,
      };
      const safeOutletId = encodeURIComponent(outletId);
      const url = `${this.circleMerchantUrl}/outlets/${safeOutletId}/add-tab`;
      return await axios.post(url, body, {
        headers: {
          'Authorization': headers['authorization'] ?? null,
          'x-device-id': headers['x-device-id'] ?? null,
        },
      });
    } catch (error) {
      this.logger.error(`FastPaymentServiceProxy.addOutletTab error`, { error });
      throw new HttpException(
        error?.response?.data?.message || error?.response?.data || 'Error in adding tab',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getOutletTabs(outletId: string, headers: Record<string, string>) {
    this.logger.info(`FastPaymentServiceProxy.getOutletTabs - starts`, { outletId, headers });
    const config = {
      headers: {
        'Authorization': headers.authorization,
        'x-device-id': headers['x-device-id'],
      },
    };
    try {
      const safeOutletId = encodeURIComponent(outletId);
      return await axios.get(`${this.circleMerchantUrl}/outlets/${safeOutletId}/tabs`, config);
    } catch (error) {
      this.logger.error(`FastPaymentServiceProxy.getOutletTabs error`, { error });
      throw new HttpException(
        error?.response?.data?.message || error?.response?.data,
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async addOutletConfig(body: AddOutletConfigDto, outletId: string, headers: Record<string, string>) {
    this.logger.info(`FastPaymentServiceProxy.addOutletConfig - starts`, { body, outletId, headers });
    try {
      const safeOutletId = encodeURIComponent(outletId);
      const url = `${this.circleMerchantUrl}/outlets/${safeOutletId}/config`;
      return await axios.post(url, body, {
        headers: {
          'Authorization': headers['authorization'] ?? null,
          'x-device-id': headers['x-device-id'] ?? null,
        },
      });
    } catch (error) {
      this.logger.error(`FastPaymentServiceProxy.addOutletConfig error`, { error });
      throw new HttpException(
        error?.response?.data?.message || error?.response?.data || 'Error in adding config',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getOutletConfig(outletId: string, headers: Record<string, string>) {
    this.logger.info(`FastPaymentServiceProxy.getOutletConfig - starts`, { outletId, headers });
    const config = {
      headers: {
        'Authorization': headers.authorization,
        'x-device-id': headers['x-device-id'],
      },
    };
    try {
      const safeOutletId = encodeURIComponent(outletId);
      return await axios.get(`${this.circleMerchantUrl}/outlets/${safeOutletId}/config`, config);
    } catch (error) {
      this.logger.error(`FastPaymentServiceProxy.getOutletConfig error`, { error });
      throw new HttpException(
        error?.response?.data?.message || error?.response?.data || 'Error in getting config',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async addOutletPriceConfig(body: SaveOutletPriceConfigDto, outletId: string, headers: Record<string, string>) {
    this.logger.info(`FastPaymentServiceProxy.addOutletPriceConfig - starts`, { body, outletId, headers });
    try {
      const safeOutletId = encodeURIComponent(outletId);
      const url = `${this.circleMerchantUrl}/outlets/${safeOutletId}/price-config`;
      return await axios.post(url, body, {
        headers: {
          'Authorization': headers['authorization'] ?? null,
          'x-device-id': headers['x-device-id'] ?? null,
        },
      });
    } catch (error) {
      this.logger.error(`FastPaymentServiceProxy.addOutletPriceConfig error`, { error });
      throw new HttpException(
        error?.response?.data?.message || error?.response?.data || 'Error in adding price config',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getOutletPriceConfig(outletId: string, headers: Record<string, string>) {
    this.logger.info(`FastPaymentServiceProxy.getOutletPriceConfig - starts`, { outletId, headers });
    const config = {
      headers: {
        'Authorization': headers.authorization,
        'x-device-id': headers['x-device-id'],
      },
    };
    try {
      const safeOutletId = encodeURIComponent(outletId);
      return await axios.get(`${this.circleMerchantUrl}/outlets/${safeOutletId}/price-config`, config);
    } catch (error) {
      this.logger.error(`FastPaymentServiceProxy.getOutletPriceConfig error`, { error });
      throw new HttpException(
        error?.response?.data?.message || error?.response?.data || 'Error in getting price config',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async updateOutlet(outletId: string, body: UpdateOutletDto, headers: Record<string, string>) {
    this.logger.info(`FastPaymentServiceProxy.updateOutlet - starts`, { outletId, body, headers });
    try {
      const safeOutletId = encodeURIComponent(outletId);
      const url = `${this.circleMerchantUrl}/outlets/${safeOutletId}`;
      const { data } = await axios.patch(url, body, {
        headers: {
          'Authorization': headers['authorization'] ?? null,
          'x-device-id': headers['x-device-id'] ?? null,
        },
      });
      return data;
    } catch (error) {
      this.logger.error(`FastPaymentServiceProxy.updateOutlet error`, { error });
      throw new HttpException(
        error?.response?.data?.message || error?.response?.data || 'Outlet in fast payment not updated',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getOutlet(outletId: string, headers: Record<string, string>) {
    this.logger.info(`FastPaymentServiceProxy.getOutlet - starts`, { outletId, headers });
    const config = {
      headers: {
        'Authorization': headers.authorization,
        'x-device-id': headers['x-device-id'],
      },
    };
    try {
      const safeOutletId = encodeURIComponent(outletId);
      return await axios.get(`${this.circleMerchantUrl}/outlets/${safeOutletId}`, config);
    } catch (error) {
      this.logger.error(`FastPaymentServiceProxy.getOutlet error`, { error });
      throw new HttpException(
        error?.response?.data?.message || error?.response?.data || 'Error in getting outlet details',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
