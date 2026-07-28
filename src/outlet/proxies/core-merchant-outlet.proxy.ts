import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IInternalApiConfig } from 'config/interface';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

@Injectable()
export class CoreMerchantOutletProxy {
  private coreUpdateOutletUrl: string;
  private managementReportingUpdateOutletUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: CustomPinoLogger
  ) {
    const { CORE_UPDATE_OUTLET, MANAGEMENT_REPORTING_OUTLET_URL } =
      this.configService.get<IInternalApiConfig>('internal-apis');
    this.coreUpdateOutletUrl = CORE_UPDATE_OUTLET;
    this.managementReportingUpdateOutletUrl = MANAGEMENT_REPORTING_OUTLET_URL;
  }

  async updateOutletInCore(
    outletId: string,
    merchantId: string,
    merchantName: string,
    outletName: string,
    merchantLogo: string,
    categoryLogo: string,
    categoryId: number,
    categoryName: string,
    country: string,
    city: string,
    merchantNo: string,
    outletNo: string,
    token: Record<string, string>,
    location: string,
    merchantNameAr: string,
    outletNameAr: string
  ) {
    const payload = {
      outletId: outletId,
      merchantId: merchantId,
      merchantName: merchantName,
      outletName: outletName,
      merchantLogo: merchantLogo,
      categoryLogo: categoryLogo,
      categoryId: categoryId,
      categoryName: categoryName,
      country: country,
      city: city,
      merchantNo: merchantNo,
      outletNo: outletNo,
      location: location,
      merchantNameAr: merchantNameAr,
      outletNameAr: outletNameAr,
    };

    this.logger.info(`CoreMerchantOutletProxy.updateOutletInCore - starts`, { payload, token });

    const config = {
      headers: {
        'Authorization': token.authorization,
        'x-device-id': token['x-device-id'],
      },
    };
    await axios.post(
      this.managementReportingUpdateOutletUrl,
      {
        outletId: outletId,
        merchantId: merchantId,
        merchantName: merchantName,
        outletName: outletName,
        merchantLogo: merchantLogo,
        categoryLogo: categoryLogo,
        categoryId: categoryId,
        categoryName: categoryName,
        country: country,
        city: city,
        outletNo: outletNo,
        merchantNo: merchantNo,
      },
      config
    );
    return await axios.post(
      this.coreUpdateOutletUrl,
      {
        outletId: outletId,
        merchantId: merchantId,
        merchantName: merchantName,
        outletName: outletName,
        merchantLogo: merchantLogo,
        categoryLogo: categoryLogo,
        categoryId: categoryId,
        categoryName: categoryName,
        country: country,
        city: city,
        outletNo: outletNo,
        merchantNo: merchantNo,
        location: location,
        merchantNameAr: merchantNameAr,
        outletNameAr: outletNameAr,
      },
      config
    );
  }
}
