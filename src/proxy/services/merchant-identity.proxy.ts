import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { EnvKeysEnum } from 'config/env.enum';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

@Injectable()
export class MerchantIdentityProxy {
  constructor(private readonly logger: CustomPinoLogger) {}

  async outletUserLinks(userId: string) {
    const url = `${process.env[EnvKeysEnum.MERCHANT_IDENTITY_URL]}/merchants/outlet-user-links/${userId}`;
    try {
      const { data } = await axios.get(url);
      const returnData = data?.data ?? null;
      this.logger.info(`MerchantIdentityProxy.outletUserLinks - response; userId: ${userId}`, { returnData, url });
      return returnData;
    } catch (error: unknown) {
      this.logger.error(`MerchantIdentityProxy.outletUserLinks - exception; userId: ${userId}`, { url, error });
      return null;
    }
  }

  async sendMerchantLiveEmail(payload: Record<string, unknown>): Promise<boolean> {
    const url = `${process.env[EnvKeysEnum.MERCHANT_IDENTITY_URL]}/merchants/send-email`;
    try {
      const { data } = await axios.post(url, payload);
      const returnData = Boolean(data?.data);
      this.logger.info(`MerchantIdentityProxy.sendMerchantLiveEmail - response;`, { data, payload, url });
      return returnData;
    } catch (error: unknown) {
      this.logger.error(`MerchantIdentityProxy.sendMerchantLiveEmail - exception;`, { url, payload, error });
      return null;
    }
  }
}
