import { HttpException } from '@nestjs/common';
import { MerchantCrmService } from '../merchant-crm.service';
import { CreateMerchantCRM } from 'src/merchant/dtos/create-merchant-crm.dto';
import { EnvKeysEnum } from 'config/env.enum';

describe('MerchantCrmService', () => {
  const merchantModel = { create: jest.fn(), findOne: jest.fn(), findByPk: jest.fn(), update: jest.fn() } as any;
  const merchantConfigurationService = { addMerchantConfiguration: jest.fn() } as any;
  const sequelize = { transaction: jest.fn() } as any;
  const categoryService = { findOrFail: jest.fn() } as any;
  const httpService = { post: jest.fn() } as any;
  const merchantFilterService = { create: jest.fn() } as any;
  const groupService = { findGroup: jest.fn(), create: jest.fn() } as any;
  const logger = { info: jest.fn(), error: jest.fn() } as any;
  const offerServiceProducer = { pushToOfferService: jest.fn() } as any;
  const paymentServiceProducer = { pushToPaymentService: jest.fn() } as any;
  const dataOperationsProducer = { pushToAuditLogService: jest.fn() } as any;

  let service: MerchantCrmService;

  const baseCrmData: CreateMerchantCRM = {
    contactCompanyName: 'Acme',
    contactFirstName: 'John',
    contactLastName: 'Doe',
    contactJobTitle: 'Manager',
    contactEmail: 'john@example.com',
    contactMobileNumber: '+971501234567',
    merchantName: 'Acme Store',
    opportunityCountry: 'UAE',
    opportunityCity: 'Dubai',
    classification: 'Gold',
    salesPerson: 'Alice',
    currentDateTime: '2025-01-01T12:00:00Z',
    maxOfferValue: 50,
    paymentPlan: 'POST-PAY',
    financeContactFirstName: 'Robert',
    financeContactLastName: 'Smith',
    financeContactJobTitle: 'CFO',
    financeContactEmail: 'robert@example.com',
    financeContactMobile: '+971507654321',
    tradeLicenseNumber: 'TL-123',
    taxRegistrationNumber: 'TR-456',
    isCircle: false,
  } as CreateMerchantCRM;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env[EnvKeysEnum.CORE_MERCHANT_URL] = 'http://core';
    process.env[EnvKeysEnum.MERCHANT_IDENTITY_URL] = 'http://identity';
    process.env[EnvKeysEnum.MIMOJO_PROFILE_ID] = 'mimojo';
    process.env[EnvKeysEnum.EIB_PROFILE_ID] = 'eib';
    process.env[EnvKeysEnum.FB_CATEGORY_ID] = 'fb-category';
    process.env[EnvKeysEnum.FINANCE_SERVICE_URL] = 'http://finance';
    sequelize.transaction.mockImplementation(async (cb: (t: any) => Promise<any>) => cb({}));
    service = new MerchantCrmService(
      merchantModel,
      merchantConfigurationService,
      sequelize,
      categoryService,
      httpService,
      merchantFilterService,
      groupService,
      logger,
      offerServiceProducer,
      paymentServiceProducer,
      dataOperationsProducer
    );
  });

  describe('createMerchantWithUserFromCRM', () => {
    it('throws when maxOfferValue is negative', async () => {
      const data = { ...baseCrmData, maxOfferValue: -1 } as CreateMerchantCRM;

      await expect(service.createMerchantWithUserFromCRM(data)).rejects.toThrow(HttpException);
    });

    it('throws when maxOfferValue is 0 and paymentPlan is PRE-PAY', async () => {
      const data = { ...baseCrmData, maxOfferValue: 0, paymentPlan: 'PRE-PAY', prepayAmount: 100 } as CreateMerchantCRM;

      await expect(service.createMerchantWithUserFromCRM(data)).rejects.toThrow(HttpException);
    });

    it('throws when category is invalid', async () => {
      categoryService.findOrFail.mockResolvedValue(null);
      groupService.findGroup.mockResolvedValue(null);
      merchantModel.findOne.mockResolvedValue(null);

      await expect(
        service.createMerchantWithUserFromCRM({
          ...baseCrmData,
          category: 'Retail',
          subCategory: 'Coffee',
        } as CreateMerchantCRM)
      ).rejects.toThrow(HttpException);
    });

    it('throws when merchant already exists', async () => {
      const category = { id: 'cat1', filters: [{ filterId: 'f1' }] } as any;
      const group = { id: 'g1' } as any;

      categoryService.findOrFail.mockResolvedValue(category);
      groupService.findGroup.mockResolvedValue(group);
      merchantModel.findOne.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createMerchantWithUserFromCRM({
          ...baseCrmData,
          category: 'Retail',
          subCategory: 'Coffee',
          groupName: 'Group',
        } as CreateMerchantCRM)
      ).rejects.toThrow(HttpException);
    });

    it('completes create flow and runs post-create side effects', async () => {
      const category = { id: 'cat1', filters: [{ filterId: 'f1', subCategoryId: 'sub1' }] } as any;
      const merchant = {
        id: 'm1',
        name: 'Acme Store',
        paymentPlan: 'POSTPAID',
        prepayAmount: 0,
        isCircle: false,
        update: jest.fn(),
      } as any;
      const created = { data: { data: { id: 'u1' } } };

      categoryService.findOrFail.mockResolvedValue(category);
      groupService.findGroup.mockResolvedValue(null);
      merchantModel.findOne.mockResolvedValue(null);
      merchantModel.create.mockResolvedValue(merchant);
      merchantFilterService.create.mockResolvedValue(undefined);
      httpService.post
        .mockResolvedValueOnce({ data: { ok: true } }) // core account configure
        .mockResolvedValueOnce(created) // identity user create
        .mockResolvedValueOnce({ data: { ok: true } }) // finance create customer
        .mockResolvedValueOnce({ data: { data: false } }); // updateCircleMerchant call
      groupService.create.mockResolvedValue({ id: 'g1' });
      merchantConfigurationService.addMerchantConfiguration.mockResolvedValue([{ currencyId: 'c1' }, true]);
      merchantModel.findByPk.mockResolvedValue(merchant);

      const setImmediateSpy = jest.spyOn(global, 'setImmediate').mockImplementation((fn: any) => {
        fn();
        return {} as any;
      });

      await service.createMerchantWithUserFromCRM({
        ...baseCrmData,
        category: 'Retail',
        subCategory: 'Drinks - Coffee',
        groupName: 'New Group',
      } as CreateMerchantCRM);

      expect(merchantModel.create).toHaveBeenCalled();
      expect(groupService.create).toHaveBeenCalled();
      expect(merchant.update).toHaveBeenCalledWith({ groupId: 'g1' }, { transaction: {} });
      expect(paymentServiceProducer.pushToPaymentService).toHaveBeenCalled();
      expect(offerServiceProducer.pushToOfferService).toHaveBeenCalled();
      expect(dataOperationsProducer.pushToAuditLogService).toHaveBeenCalled();
      expect(merchantConfigurationService.addMerchantConfiguration).toHaveBeenCalled();
      setImmediateSpy.mockRestore();
    });

    it('throws when transaction creation fails and wraps as bad request', async () => {
      const category = { id: 'cat1', filters: [{ filterId: 'f1' }] } as any;
      categoryService.findOrFail.mockResolvedValue(category);
      groupService.findGroup.mockResolvedValue(null);
      merchantModel.findOne.mockResolvedValue(null);
      sequelize.transaction.mockRejectedValue(new Error('txn failed'));

      await expect(
        service.createMerchantWithUserFromCRM({
          ...baseCrmData,
          category: 'Retail',
          subCategory: 'Coffee',
        } as CreateMerchantCRM)
      ).rejects.toThrow(HttpException);
    });
  });

  describe('internal helpers', () => {
    it('creates merchant in transaction and maps PRE-PAY and mids', async () => {
      const merchant = { id: 'm1', paymentPlan: 'PREPAID', prepayAmount: 25, update: jest.fn() } as any;
      merchantModel.create.mockResolvedValue(merchant);
      merchantFilterService.create.mockResolvedValue(undefined);
      httpService.post.mockResolvedValueOnce({ data: { ok: true } }).mockResolvedValueOnce({ data: { data: { id: 'u1' } } });
      groupService.create.mockResolvedValue({ id: 'g1' });

      const result = await (service as any).runCreateMerchantFromCrmTransaction(
        {
          ...baseCrmData,
          paymentPlan: 'PRE-PAY',
          prepayAmount: 25,
          opportunityInitialMIDs: '111,222',
          groupName: 'G',
        },
        { filters: [{ filterId: 'f1' }] },
        null
      );

      expect(merchantModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentPlan: 'PREPAID',
          prepayAmount: 25,
          merchantMids: ['111', '222'],
        }),
        { transaction: {} }
      );
      expect(result).toBe(merchant);
    });

    it('handles addMerchantConfiguration fallback on error', async () => {
      merchantConfigurationService.addMerchantConfiguration.mockRejectedValue(new Error('boom'));
      const result = await (service as any).addMerchantConfiguration('m1', 'UAE');
      expect(result).toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
    });

    it('uses qatar timezone and currency when adding merchant configuration', async () => {
      merchantConfigurationService.addMerchantConfiguration.mockResolvedValue([{ id: 'cfg1' }, true]);
      await (service as any).addMerchantConfiguration('m1', 'Qatar');
      expect(merchantConfigurationService.addMerchantConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          merchantId: 'm1',
          timezoneInfo: 'Asia/Qatar',
        })
      );
    });

    it('resolves finance category id with fb category mapping', () => {
      const result = (service as any).resolveFinanceCategoryIdForMerchant({
        id: 'fb-category',
        filters: [{ subCategoryId: 'sub-finance' }],
      });
      expect(result).toBe('sub-finance');
    });

    it('logs and swallows finance service error', async () => {
      merchantModel.findOne.mockResolvedValue({ dataValues: { merchant_no: 'MNO1' } });
      httpService.post.mockRejectedValue(new Error('finance fail'));
      await (service as any).postCreateCustomerOnFinanceService(
        { id: 'm1', name: 'M', paymentPlan: 'POSTPAID', city: 'Dubai' },
        { id: 'cat1', filters: [{ subCategoryId: 'sub1' }] },
        { currencyId: 'c1' }
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it('throws when core merchant account configuration fails in transaction', async () => {
      merchantModel.create.mockResolvedValue({ id: 'm1', paymentPlan: 'POSTPAID', prepayAmount: 0 });
      httpService.post.mockRejectedValueOnce(new Error('core failed'));

      await expect(
        (service as any).runCreateMerchantFromCrmTransaction(
          { ...baseCrmData, groupName: undefined },
          { filters: [{ filterId: 'f1' }] },
          null
        )
      ).rejects.toThrow(HttpException);
    });

    it('throws when merchant user creation fails in transaction', async () => {
      merchantModel.create.mockResolvedValue({ id: 'm1', paymentPlan: 'POSTPAID', prepayAmount: 0 });
      merchantFilterService.create.mockResolvedValue(undefined);
      httpService.post.mockResolvedValueOnce({ data: { ok: true } }).mockRejectedValueOnce(new Error('identity failed'));

      await expect(
        (service as any).runCreateMerchantFromCrmTransaction(
          { ...baseCrmData, groupName: undefined },
          { filters: [{ filterId: 'f1' }] },
          null
        )
      ).rejects.toThrow(HttpException);
    });
  });

  describe('updateCircleMerchant', () => {
    it('throws when merchant not found', async () => {
      merchantModel.findByPk = jest.fn().mockResolvedValue(null);

      await expect(service.updateCircleMerchant({ merchantId: 'm1', name: 'M', status: 'PENDING' } as any)).rejects.toThrow(
        HttpException
      );
    });

    it('returns true when fast payment update succeeds', async () => {
      const merchant = { update: jest.fn().mockResolvedValue({}) };
      merchantModel.findByPk = jest.fn().mockResolvedValue(merchant);
      httpService.post.mockResolvedValue({ data: { data: true } });

      const result = await service.updateCircleMerchant({ merchantId: 'm1', name: 'M', status: 'PENDING' } as any, {
        authorization: 'Bearer x',
        deviceId: 'd1',
      });

      expect(result).toBe(true);
      expect(merchant.update).toHaveBeenCalledWith({ fastPaymentStatus: 'PENDING', updatedBy: undefined });
    });

    it('returns false when fast payment returns data false', async () => {
      const merchant = { update: jest.fn() };
      merchantModel.findByPk = jest.fn().mockResolvedValue(merchant);
      httpService.post.mockResolvedValue({ data: { data: false } });

      const result = await service.updateCircleMerchant({ merchantId: 'm1', name: 'M', status: 'PENDING' } as any);

      expect(result).toBe(false);
      expect(merchant.update).not.toHaveBeenCalled();
    });

    it('logs and returns undefined when fast payment call throws', async () => {
      merchantModel.findByPk = jest.fn().mockResolvedValue({ update: jest.fn() });
      httpService.post.mockRejectedValue(new Error('fast payment failed'));

      const result = await service.updateCircleMerchant({ merchantId: 'm1', name: 'M', status: 'PENDING' } as any);

      expect(result).toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
