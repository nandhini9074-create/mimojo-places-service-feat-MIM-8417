import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IInternalApiConfig } from 'config/interface';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

@Injectable()
export class FinanceServiceProxy {
  private readonly financeServiceUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: CustomPinoLogger
  ) {
    const { FINANCE_SERVICE_URL } = this.configService.get<IInternalApiConfig>('internal-apis');
    this.financeServiceUrl = FINANCE_SERVICE_URL;
  }

  async syncNewOutlet(
    outletId: string,
    outletName: string,
    categoryIds: string[],
    city: string,
    outletNo: string,
    paymentPlan: string,
    token: Record<string, string>,
    currencyId: string
  ) {
    this.logger.info('FinanceServiceProxy.syncNewOutlet - start', { outletId, outletName, city });
    try {
      const config = {
        headers: {
          'Authorization': token.authorization,
          'x-device-id': token['x-device-id'],
        },
      };
      const response = await axios.post(
        this.financeServiceUrl,
        {
          id: outletId,
          customerNo: outletNo,
          name: outletName,
          categories: categoryIds,
          subCategories: [],
          paymentGroup: paymentPlan,
          customerRegion: city,
          currencyId: currencyId,
        },
        config
      );
      this.logger.info('FinanceServiceProxy.syncNewOutlet - end', { response });
      return response;
    } catch (ex) {
      console.log(ex);
      this.logger.error('FinanceServiceProxy.syncNewOutlet - exception', { error: ex, outletId, outletName, city });
    }
  }
}
