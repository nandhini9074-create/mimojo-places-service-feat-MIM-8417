import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { internalApisConfig } from 'config/server.config';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

@Injectable()
export class OfferServiceProxy {
  private readonly GRAVITEE_URL: string;
  constructor(private readonly logger: CustomPinoLogger) {
    this.GRAVITEE_URL = internalApisConfig().GRAVITEE_URL;
  }

  async checkMerchantHasActiveOffer(merchantId: string, token: string): Promise<boolean> {
    const headers = {
      Authorization: token,
    };
    const url = `${this.GRAVITEE_URL}/offersv2/merchant/current/${merchantId}/check`;
    try {
      const { data } = await axios.get(url, { headers });
      const returnData = data?.data ?? false;
      this.logger.info(`OfferServiceProxy.checkMerchantHasActiveOffer - response; merchantId: ${merchantId}`, {
        returnData,
        url,
      });
      return returnData;
    } catch (error: unknown) {
      this.logger.error(`OfferServiceProxy.checkMerchantHasActiveOffer - exception; merchantId: ${merchantId}`, {
        url,
        error,
      });
      return false;
    }
  }
}
