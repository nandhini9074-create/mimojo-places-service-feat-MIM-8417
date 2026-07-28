import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvKeysEnum } from 'config/env.enum';
import { IInternalApiConfig } from 'config/interface';
import { DataOperationsProducer } from 'src/kafka-services/data-operations.producer';
import { OutletProducer } from 'src/kafka-services/outlet.producer';
import { MerchantService } from 'src/merchant/services/merchant.service';
import { UploadOutletStatusDto } from '../dtos/update-status-dto';
import { OutletStatusEnum } from '../enums/outlet-status-enum';
import { Outlet } from '../models/outlet.model';
import { FinanceServiceProxy } from '../proxies/finance-service.proxy';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';
import { OutletDetailsView } from './outlet-details-view.interface';

@Injectable()
export class OutletAuditFinanceService {
  private readonly FoodAndDrinkCategoryId: string;
  private readonly fbCategoryTypeIds: string[];

  constructor(
    private readonly configService: ConfigService,
    private readonly financeServiceProxy: FinanceServiceProxy,
    private readonly dataOperationsProducer: DataOperationsProducer,
    private readonly outletProducer: OutletProducer,
    @Inject(forwardRef(() => MerchantService))
    private readonly merchantService: MerchantService,
    private readonly logger: CustomPinoLogger
  ) {
    const { FB_CATEGORY_ID, CATEGORY_TYPES } = this.configService.get<IInternalApiConfig>('internal-apis');
    this.FoodAndDrinkCategoryId = FB_CATEGORY_ID;
    this.fbCategoryTypeIds = CATEGORY_TYPES?.split(',');
  }

  async pushOutletToFinance(
    merchantId: string,
    outletDetails: OutletDetailsView,
    city: string,
    token: Record<string, string>
  ): Promise<unknown> {
    this.logger.info('OutletAuditFinanceService.pushOutletToFinance - start', {
      merchantId,
      outletDetails,
      city,
    });
    try {
      if (!outletDetails) return;
      const response = await this.merchantService.getMerchant(merchantId);
      if (!response) return;
      const categoryId = this.resolveFinanceCategoryId(outletDetails);
      const financeResponse = await this.financeServiceProxy.syncNewOutlet(
        outletDetails.id,
        outletDetails.name,
        [categoryId],
        city,
        outletDetails.outletNo,
        response.merchant?.paymentPlan,
        token,
        response?.merchantConfiguration?.currencyId
      );
      this.logger.info('OutletAuditFinanceService.pushOutletToFinance - end', { financeResponse });
      return financeResponse;
    } catch (error) {
      this.logger.error('OutletAuditFinanceService.pushOutletToFinance - exception', {
        error,
        merchantId,
        outletDetails,
      });
    }
  }

  resolveFinanceCategoryId(outletDetails: OutletDetailsView): string | undefined {
    let categoryId = outletDetails.outletFilters?.[0]?.filter?.category?.id;
    if (categoryId === this.FoodAndDrinkCategoryId) {
      const subCategoryIds = outletDetails.outletFilters?.map(f => f.filter?.subCategory?.id);
      const includedSubCategories = subCategoryIds ? this.fbCategoryTypeIds?.filter(id => subCategoryIds.includes(id)) : [];
      if (includedSubCategories?.length > 0) categoryId = includedSubCategories[0];
    }
    return categoryId;
  }

  pushOutletToAuditLog(response: Record<string, unknown>, isGoogleOutlet: boolean, isNewOutlet: boolean): void {
    const payload = { status: 'COMPLETED' as const, values: response };
    const service = 'mimojo-places-service';

    if (isGoogleOutlet) {
      this.pushAuditLog(service, payload, EnvKeysEnum.AUDIT_LOG_NODE_NEW_OUTLET_GOOGLE);
      this.pushAuditLog(service, payload, EnvKeysEnum.AUDIT_LOG_MERCHANT_NODE_NEW_OUTLET);
    } else {
      this.pushAuditLog(
        service,
        payload,
        isNewOutlet ? EnvKeysEnum.AUDIT_LOG_NODE_NEW_OUTLET_MANUAL : EnvKeysEnum.AUDIT_LOG_NODE_CONFIGURATION
      );
      if (isNewOutlet) {
        this.pushAuditLog(service, payload, EnvKeysEnum.AUDIT_LOG_MERCHANT_NODE_NEW_OUTLET);
      }
    }
  }

  private pushAuditLog(service: string, payload: { status: string; values: unknown }, configKey: EnvKeysEnum): void {
    this.dataOperationsProducer.pushToAuditLogService(service, payload, {
      audit_main_node_configuration_id: process.env[configKey],
    });
  }

  async pushNodeStatusToAuditLog(request: UploadOutletStatusDto, response: Outlet): Promise<void> {
    const statusMap: Record<OutletStatusEnum, string> = {
      [OutletStatusEnum.Pending]: 'PENDING',
      [OutletStatusEnum.Ready]: 'INACTIVE',
      [OutletStatusEnum.Active]: 'ACTIVE',
      [OutletStatusEnum['Not Enrolled']]: 'NOT_ENROLLED',
    };
    const status = statusMap[request.status] ?? request.status;
    this.pushAuditLog('mimojo-places-service', { status, values: response }, EnvKeysEnum.AUDIT_LOG_NODE_STATUS);
  }

  async pushOutletActiveStatusToKafka(merchantId: string, outletId: string, profileId: string): Promise<void> {
    this.logger.info('OutletAuditFinanceService.pushOutletActiveStatusToKafka - start', {
      merchantId,
      outletId,
      profileId,
    });
    try {
      const payload = {
        merchantId,
        outletId,
        profileId,
      };
      await this.outletProducer.pushToKafka(
        'outlet-active-status',
        payload,
        process.env[EnvKeysEnum.KAFKA_OUTLET_ACTIVE_STATUS_TOPIC]
      );
      this.logger.info('OutletAuditFinanceService.pushOutletActiveStatusToKafka - end', { payload });
    } catch (error) {
      this.logger.error('OutletAuditFinanceService.pushOutletActiveStatusToKafka - exception', {
        error,
        merchantId,
        outletId,
        profileId,
      });
    }
  }
}
