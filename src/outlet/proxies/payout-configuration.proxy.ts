import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IInternalApiConfig } from 'config/interface';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

@Injectable()
export class PayoutConfigurationProxy {
  private payoutConfigRewardMerchantUrl: string;
  private graviteeApiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: CustomPinoLogger
  ) {
    const { PAYOUT_CONFIG_RE_MERCHANT_URL, GRAVITEE_API_KEY } = this.configService.get<IInternalApiConfig>('internal-apis');

    this.payoutConfigRewardMerchantUrl = PAYOUT_CONFIG_RE_MERCHANT_URL;
    this.graviteeApiKey = GRAVITEE_API_KEY;
  }

  public async getRewardEngineBetaMerchants() {
    const url = this.payoutConfigRewardMerchantUrl;
    const config = {
      headers: {
        'x-gravitee-api-key': this.graviteeApiKey,
      },
    };
    try {
      const data = await axios.get(url, config);
      return data?.data;
    } catch (ex) {
      this.logger.error(`PayoutConfigurationProxy.getRewardEngineBetaMerchants - exception`, { error: ex, url, config });
      return [];
    }
  }
}
