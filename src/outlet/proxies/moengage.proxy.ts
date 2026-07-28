import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IInternalApiConfig } from 'config/interface';
import axios from 'axios';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

@Injectable()
export class MoEngageProxy {
  private moengageOutletEvent: string;
  private moengageOutletEventUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: CustomPinoLogger
  ) {
    const { MOENGAGE_OUTLET_EVENT, MOENGAGE_OUTLET_EVENT_URL } = this.configService.get<IInternalApiConfig>('internal-apis');
    this.moengageOutletEvent = MOENGAGE_OUTLET_EVENT;
    this.moengageOutletEventUrl = MOENGAGE_OUTLET_EVENT_URL;
  }

  async postOutletActive(
    outletId: string,
    outletName: string,
    merchantId: string,
    merchantName: string,
    token: Record<string, string>
  ) {
    try {
      const config = {
        headers: {
          'Authorization': token.authorization,
          'x-device-id': token['x-device-id'],
        },
      };

      const body = {
        event: this.moengageOutletEvent,
        attributes: {
          outletId: outletId,
          outletName: outletName,
          merchantId: merchantId,
          merchantName: merchantName,
        },
      };

      return await axios.post(this.moengageOutletEventUrl, body, config);
    } catch (error) {
      this.logger.error('MoEngageProxy.postOutletActive method error', { error });
      //   throw new NotFoundException('Something went wrong on moengage api call!');
    }
  }
}
