import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IInternalApiConfig } from 'config/interface';

@Injectable()
export class MerchantMetadataProxy {
  private merchantCategoryUrl: string;
  private updateOutletCountUrl: string;
  private merchantGetByIdUrl: string;

  constructor(private readonly configService: ConfigService) {
    const { MERCHANT_CATEGORIES, UPDATE_ACTIVE_INACTIVE_OUTLET_COUNT, MERCHANT_GET_BY_ID_URL } =
      this.configService.get<IInternalApiConfig>('internal-apis');
    this.merchantCategoryUrl = MERCHANT_CATEGORIES;
    this.updateOutletCountUrl = UPDATE_ACTIVE_INACTIVE_OUTLET_COUNT;
    this.merchantGetByIdUrl = MERCHANT_GET_BY_ID_URL;
  }

  async getMerchantMetadata(merchantId: string, token: Record<string, string>) {
    const config = {
      headers: {
        'Authorization': token.authorization,
        'x-device-id': token['x-device-id'],
      },
    };
    return await axios.get(this.merchantCategoryUrl.replace(':id', String(merchantId)), config);
  }

  async getMerchantById(merchantId: string, token: Record<string, string>) {
    try {
      const config = {
        headers: {
          'Authorization': token.authorization,
          'x-device-id': token['x-device-id'],
        },
      };
      return await axios.get(this.merchantGetByIdUrl.replace(':id', String(merchantId)), config);
    } catch (ex) {
      throw new NotFoundException('Merchant not found for merchant metadata');
    }
  }

  async updateOutletActiveInactiveCount(
    merchantId: string,
    active: number,
    inactive: number,
    token: Record<string, string>
  ) {
    try {
      const config = {
        headers: {
          'Authorization': token.authorization,
          'x-device-id': token['x-device-id'],
        },
      };

      return await axios.patch(
        this.updateOutletCountUrl.replace(':merchantId', String(merchantId)),
        {
          activeOutletsNum: active,
          inActiveOutletsNum: inactive,
        },
        config
      );
    } catch {
      throw new NotFoundException('Merchant not found on merchant portal');
    }
  }
}
