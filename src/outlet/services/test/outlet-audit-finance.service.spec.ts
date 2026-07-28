import { OutletAuditFinanceService } from '../outlet-audit-finance.service';
import { OutletStatusEnum } from 'src/outlet/enums/outlet-status-enum';
import { UploadOutletStatusDto } from 'src/outlet/dtos/update-status-dto';
import { EnvKeysEnum } from 'config/env.enum';

describe('OutletAuditFinanceService', () => {
  const configService = {
    get: jest.fn().mockReturnValue({
      FB_CATEGORY_ID: 'food-drink-id',
      CATEGORY_TYPES: 'sub1,sub2',
    }),
  } as any;
  const financeServiceProxy = { syncNewOutlet: jest.fn() } as any;
  const dataOperationsProducer = { pushToAuditLogService: jest.fn() } as any;
  const outletProducer = { pushToKafka: jest.fn() } as any;
  const merchantService = { getMerchant: jest.fn() } as any;
  const logger = { info: jest.fn(), error: jest.fn() } as any;

  let service: OutletAuditFinanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env[EnvKeysEnum.AUDIT_LOG_NODE_STATUS] = 'audit-status-id';
    process.env[EnvKeysEnum.AUDIT_LOG_NODE_NEW_OUTLET_GOOGLE] = 'google-id';
    process.env[EnvKeysEnum.AUDIT_LOG_MERCHANT_NODE_NEW_OUTLET] = 'merchant-new-id';
    process.env[EnvKeysEnum.AUDIT_LOG_NODE_NEW_OUTLET_MANUAL] = 'manual-id';
    process.env[EnvKeysEnum.AUDIT_LOG_NODE_CONFIGURATION] = 'config-id';
    process.env[EnvKeysEnum.KAFKA_OUTLET_ACTIVE_STATUS_TOPIC] = 'active-topic';
    service = new OutletAuditFinanceService(
      configService,
      financeServiceProxy,
      dataOperationsProducer,
      outletProducer,
      merchantService,
      logger
    );
  });

  describe('pushOutletToFinance', () => {
    it('returns early when outletDetails is null', async () => {
      await service.pushOutletToFinance('m1', null as any, 'City', {});
      expect(merchantService.getMerchant).not.toHaveBeenCalled();
    });

    it('returns early when merchant response is null', async () => {
      merchantService.getMerchant.mockResolvedValue(null);
      await service.pushOutletToFinance('m1', { outletNo: 'ON1', outletPhotos: [] } as any, 'City', {});
      expect(financeServiceProxy.syncNewOutlet).not.toHaveBeenCalled();
    });

    it('syncs outlet to finance when merchant exists', async () => {
      const outletDetails = {
        id: 'outlet-1',
        name: 'Outlet',
        outletNo: 'ON1',
        outletPhotos: [],
        outletFilters: [{ filter: { category: { id: 'cat1' } } }],
      };
      merchantService.getMerchant.mockResolvedValue({
        merchant: { paymentPlan: 'plan' },
        merchantConfiguration: { currencyId: 'USD' },
      });
      financeServiceProxy.syncNewOutlet.mockResolvedValue({});

      await service.pushOutletToFinance('m1', outletDetails as any, 'City', { token: 'x' });

      expect(financeServiceProxy.syncNewOutlet).toHaveBeenCalledWith(
        'outlet-1',
        'Outlet',
        ['cat1'],
        'City',
        'ON1',
        'plan',
        { token: 'x' },
        'USD'
      );
    });

    it('catches and logs errors without throwing', async () => {
      merchantService.getMerchant.mockRejectedValue(new Error('Network error'));
      await expect(
        service.pushOutletToFinance('m1', { outletNo: 'ON1', outletPhotos: [] } as any, 'City', {})
      ).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('resolveFinanceCategoryId', () => {
    it('returns category id from first filter', () => {
      const outletDetails = {
        outletFilters: [{ filter: { category: { id: 'cat1' } } }],
      };
      expect(service.resolveFinanceCategoryId(outletDetails as any)).toBe('cat1');
    });

    it('returns subCategory id when category is FoodAndDrink', () => {
      const outletDetails = {
        outletFilters: [{ filter: { category: { id: 'food-drink-id' }, subCategory: { id: 'sub1' } } }],
      };
      expect(service.resolveFinanceCategoryId(outletDetails as any)).toBe('sub1');
    });
  });

  describe('pushOutletToAuditLog', () => {
    it('pushes to google and merchant when isGoogleOutlet', () => {
      const response = { id: '1' };
      service.pushOutletToAuditLog(response, true, false);
      expect(dataOperationsProducer.pushToAuditLogService).toHaveBeenCalledTimes(2);
    });

    it('pushes to manual/config and merchant when not google and isNewOutlet', () => {
      const response = { id: '1' };
      service.pushOutletToAuditLog(response, false, true);
      expect(dataOperationsProducer.pushToAuditLogService).toHaveBeenCalledTimes(2);
    });

    it('pushes only to config when not google and not new', () => {
      const response = { id: '1' };
      service.pushOutletToAuditLog(response, false, false);
      expect(dataOperationsProducer.pushToAuditLogService).toHaveBeenCalledTimes(1);
    });
  });

  describe('pushNodeStatusToAuditLog', () => {
    it('maps status and pushes to audit log', async () => {
      const request: UploadOutletStatusDto = { outletId: 'o1', status: OutletStatusEnum.Active };
      const response = { outletId: 'o1' } as any;
      await service.pushNodeStatusToAuditLog(request, response);
      expect(dataOperationsProducer.pushToAuditLogService).toHaveBeenCalledWith(
        'mimojo-places-service',
        { status: 'ACTIVE', values: response },
        { audit_main_node_configuration_id: 'audit-status-id' }
      );
    });
  });

  describe('pushOutletActiveStatusToKafka', () => {
    it('pushes payload to kafka', async () => {
      outletProducer.pushToKafka.mockResolvedValue(undefined);
      await service.pushOutletActiveStatusToKafka('m1', 'o1', 'p1');
      expect(outletProducer.pushToKafka).toHaveBeenCalledWith(
        'outlet-active-status',
        { merchantId: 'm1', outletId: 'o1', profileId: 'p1' },
        'active-topic'
      );
    });

    it('catches and logs errors without throwing', async () => {
      outletProducer.pushToKafka.mockRejectedValue(new Error('Kafka error'));
      await expect(service.pushOutletActiveStatusToKafka('m1', 'o1', 'p1')).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
