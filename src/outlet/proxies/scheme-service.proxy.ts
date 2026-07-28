import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IInternalApiConfig } from 'config/interface';
import { buildOutletTerminalPayload, buildSchemeHeaders } from './scheme-outlet.util';

@Injectable()
export class SchemeServiceProxy {
  private schemeServiceOutletStatus: string;
  private schemeServiceDisableOutlets: string;
  private schemeServiceEnableOutlets: string;
  private readonly graviteeUrl: string;

  constructor(private readonly configService: ConfigService) {
    const { SCHEME_SERVICE_OUTLET_STATUS, SCHEME_SERVICE_DISABLE_OUTLETS, SCHEME_SERVICE_ENABLE_OUTLETS, GRAVITEE_URL } =
      this.configService.get<IInternalApiConfig>('internal-apis');
    this.schemeServiceOutletStatus = SCHEME_SERVICE_OUTLET_STATUS;
    this.schemeServiceDisableOutlets = SCHEME_SERVICE_DISABLE_OUTLETS;
    this.schemeServiceEnableOutlets = SCHEME_SERVICE_ENABLE_OUTLETS;
    this.graviteeUrl = GRAVITEE_URL;
  }

  async getSchemeTransactionServiceStatus(outletId: string, token: Record<string, string>) {
    try {
      const config = buildSchemeHeaders(token);
      return await axios.get(this.schemeServiceOutletStatus.replace(':outletId', String(outletId)), config);
    } catch {
      throw new NotFoundException('Outlet is not active on scheme!');
    }
  }

  async getSchemeTransactionDisableOutlet(outletId: string, token: Record<string, string>) {
    try {
      const payload = await buildOutletTerminalPayload(outletId, 'disableTerminalsOnly');
      const config = buildSchemeHeaders(token);
      return await axios.post(this.schemeServiceDisableOutlets, payload, config);
    } catch {
      throw new NotFoundException('Outlet is not disabled on scheme!');
    }
  }

  async getSchemeTransactionEnableOutlet(outletId: string, token: Record<string, string>) {
    try {
      const payload = await buildOutletTerminalPayload(outletId, 'enableTerminalsOnly');
      const config = buildSchemeHeaders(token);
      return await axios.post(this.schemeServiceEnableOutlets, payload, config);
    } catch {
      throw new NotFoundException('Outlet is not enabled on scheme!');
    }
  }
  async getVisaB2bMerchantOnboardingAvailability(profileIds: string[], token: Record<string, string>) {
    try {
      const config = {
        headers: {
          'Authorization': token?.authorization,
          'x-device-id': token?.['x-device-id'],
        },
      };
      const data = await axios.post(
        `${this.graviteeUrl}/schemes/visa/b2b-merchant-onboarding/profiles/eligibility`,
        {
          profileIds,
        },
        config
      );
      return data?.data?.data;
    } catch (error) {
      throw new HttpException(
        error?.response?.data ?? 'Error fetching Visa B2B Merchant Onboarding Availability',
        error?.response?.status ?? HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
