import { Injectable } from '@nestjs/common';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';
import { OutletProfileMappingService } from 'src/outlet/services/outlet-profile-mapping.service';
import { OutletService } from 'src/outlet/services/outlet.service';

dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class ScheduleService {
  constructor(
    private readonly logger: CustomPinoLogger,
    private readonly outletProfileMappingService: OutletProfileMappingService,
    private readonly outletService: OutletService
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async unMapExpiringOutletsFromProfile() {
    try {
      const yesterday = dayjs().tz('Asia/Dubai').subtract(1, 'day');

      const startUtc = yesterday.startOf('day').toDate(); // JS Date
      const endUtc = yesterday.endOf('day').toDate();

      this.logger.info(
        `ScheduleService.unMapExpiringOutletsFromProfile - starts to fetch data for UTC range: ${startUtc} - ${endUtc}`
      );
      const expiredOutlets = await this.outletProfileMappingService.getExpiredOutlets(startUtc, endUtc);

      if (!expiredOutlets?.length) return;

      const outletIds = expiredOutlets.map(o => o.outletId);

      const outletsWithMerchant = await this.outletService.findOutletsByIds(outletIds);
      const outletMerchantMap = new Map(outletsWithMerchant.map(o => [o.outletId, o.merchantId]));

      const results = await Promise.allSettled(
        expiredOutlets
          .filter(o => {
            const hasMerchant = outletMerchantMap.has(o.outletId);
            if (!hasMerchant) {
              this.logger.info(`Skipping outlet ${o.outletId}: missing merchantId`);
            }
            return hasMerchant;
          })
          .map(outlet => {
            const merchantId = outletMerchantMap.get(outlet.outletId);
            const payload = {
              profileId: outlet.profileId,
              outletId: outlet.outletId,
              merchantId,
              mapToProfile: false,
            };
            return this.outletProfileMappingService.mapOutletToProfile(payload, null);
          })
      );
      const failures = results.filter(r => r.status === 'rejected').length;
      this.logger.info(
        `ScheduleService.unMapExpiringOutletsFromProfile - Unmap job finished. Succeeded: ${results.length - failures}, Failed: ${failures}`
      );
    } catch (error) {
      this.logger.error('ScheduleService.unMapExpiringOutletsFromProfile - exception', { error });
    }
  }
}
