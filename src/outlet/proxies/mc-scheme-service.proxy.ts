import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IInternalApiConfig } from 'config/interface';
import { buildOutletTerminalPayload, buildSchemeHeaders } from './scheme-outlet.util';

@Injectable()
export class MastercardSchemeServiceProxy {
  private schemeServiceOutletStatus: string;
  private schemeServiceDisableOutlets: string;
  private schemeServiceEnableOutlets: string;

  constructor(private readonly configService: ConfigService) {
    const { MC_SCHEME_SERVICE_OUTLET_STATUS, MC_SCHEME_SERVICE_DISABLE_OUTLETS, MC_SCHEME_SERVICE_ENABLE_OUTLETS } =
      this.configService.get<IInternalApiConfig>('internal-apis');
    this.schemeServiceOutletStatus = MC_SCHEME_SERVICE_OUTLET_STATUS;
    this.schemeServiceDisableOutlets = MC_SCHEME_SERVICE_DISABLE_OUTLETS;
    this.schemeServiceEnableOutlets = MC_SCHEME_SERVICE_ENABLE_OUTLETS;
  }

  async getSchemeTransactionServiceStatus(outletId: string, token: Record<string, string>) {
    try {
      const config = buildSchemeHeaders(token);
      return await axios.get(this.schemeServiceOutletStatus.replace(':outletId', String(outletId)), config);
    } catch {
      throw new NotFoundException('Outlet is not active on mastercard!');
    }
  }

  async getSchemeTransactionDisableOutlet(outletId: string, token: Record<string, string>) {
    try {
      const payload = await buildOutletTerminalPayload(outletId, 'disableTerminalsOnly');
      const config = buildSchemeHeaders(token);
      return await axios.post(this.schemeServiceDisableOutlets, payload, config);
    } catch {
      throw new NotFoundException('Outlet is not disabled on mastercard!');
    }
  }

  async getSchemeTransactionEnableOutlet(outletId: string, token: Record<string, string>) {
    try {
      const payload = await buildOutletTerminalPayload(outletId, 'enableTerminalsOnly');
      const config = buildSchemeHeaders(token);
      return await axios.post(this.schemeServiceEnableOutlets, payload, config);
    } catch {
      throw new NotFoundException('Outlet is not enabled on mastercard!');
    }
  }
}
