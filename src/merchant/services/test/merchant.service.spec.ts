import { HttpException, HttpStatus } from '@nestjs/common';
import { Op } from 'sequelize';
import { MerchantService } from '../merchant.service';
import { MerchantStatusEnum } from 'src/merchant/enums/merchant-status.enum';
import { MerchantPaymentPlanEnum } from 'src/merchant/enums/merchant-payment-plan.enum';
import { EnvKeysEnum } from 'config/env.enum';

jest.mock('src/groups/entities/group.model', () => ({
  Group: {
    findOne: jest.fn(),
  },
}));

jest.mock('src/filters/models/filter.model', () => ({
  Filter: {
    findAndCountAll: jest.fn(),
  },
}));

jest.mock('src/outlet/models/outlet.model', () => ({
  Outlet: {
    findAll: jest.fn(),
  },
}));

import { Group } from 'src/groups/entities/group.model';
import { Filter } from 'src/filters/models/filter.model';
import { Outlet } from 'src/outlet/models/outlet.model';

describe('MerchantService', () => {
  const merchantModel = {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findAndCountAll: jest.fn(),
    update: jest.fn(),
  } as any;

  const merchantConfigurationService = { getMerchantConfigurationByMerchantId: jest.fn() } as any;
  const sequelize = { transaction: jest.fn() } as any;
  const httpService = { get: jest.fn(), post: jest.fn() } as any;
  const merchantFilterService = { create: jest.fn(), updateMerchantFiltersStatus: jest.fn() } as any;
  const groupMerchantService = { getAllMerchants: jest.fn() } as any;
  const logger = { info: jest.fn(), error: jest.fn() } as any;
  const dataOperationsProducer = { pushToAuditLogService: jest.fn() } as any;
  const merchantIdentityProxy = {
    outletUserLinks: jest.fn(),
    sendMerchantLiveEmail: jest.fn(),
  } as any;
  const outletService = { updateMerchantMetadataToOutlet: jest.fn(), updateOutletsStatus: jest.fn() } as any;
  const merchantProfile = { update: jest.fn() } as any;
  const offerServiceProxy = { checkMerchantHasActiveOffer: jest.fn() } as any;
  const rewardEngineWrapperProxy = { checkMerchantHasActiveOffer: jest.fn() } as any;
  const merchantCrmService = { createMerchantWithUserFromCRM: jest.fn(), updateCircleMerchant: jest.fn() } as any;

  let service: MerchantService;

  const makeMerchant = (overrides: Record<string, unknown> = {}) => ({
    id: 'm1',
    name: 'Merchant',
    city: 'Dubai',
    country: 'UAE',
    filters: [{ id: 'f1' }],
    dataValues: { id: 'm1', name: 'Merchant' },
    update: jest.fn().mockResolvedValue({}),
    save: jest.fn().mockResolvedValue({}),
    reload: jest.fn().mockResolvedValue({}),
    get: jest.fn().mockReturnValue({}),
    $set: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CORE_MERCHANT_URL = 'http://core-merchant';
    process.env.MERCHANT_OFFER_URL = 'http://merchant-offer/';
    process.env.MERCHANT_IDENTITY_URL = 'http://merchant-identity';
    process.env[EnvKeysEnum.AUDIT_LOG_NODE_MERCHANT_STATUS] = 'audit-node';
    sequelize.transaction.mockImplementation((fn: (t: any) => Promise<any>) => fn({}));
    service = new MerchantService(
      merchantModel,
      merchantConfigurationService,
      sequelize,
      httpService,
      merchantFilterService,
      groupMerchantService,
      logger,
      dataOperationsProducer,
      merchantIdentityProxy,
      outletService,
      merchantProfile,
      offerServiceProxy,
      rewardEngineWrapperProxy,
      merchantCrmService
    );
  });

  describe('getMerchantById', () => {
    it('returns merchant with payment plan from config', async () => {
      const merchant = makeMerchant();
      merchantModel.findByPk.mockResolvedValue(merchant);
      httpService.get.mockResolvedValue({ data: { data: { paymentTerm: 'PREPAID' } } });

      const result = await service.getMerchantById('m1');

      expect(merchantModel.findByPk).toHaveBeenCalledWith('m1', expect.any(Object));
      expect(result).toBe(merchant);
      expect(result.paymentPlan).toBe('PREPAID');
    });

    it('throws when merchant not found', async () => {
      merchantModel.findByPk.mockResolvedValue(null);

      await expect(service.getMerchantById('m1')).rejects.toThrow(HttpException);
      expect(logger.error).toHaveBeenCalled();
    });

    it('throws with error message on exception', async () => {
      merchantModel.findByPk.mockRejectedValue(new Error('db error'));

      await expect(service.getMerchantById('m1')).rejects.toThrow(HttpException);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getCoreMerchantAccountConfiguration', () => {
    it('fetches merchant core account configuration', async () => {
      httpService.get.mockResolvedValue({ data: { paymentTerm: 'PREPAID' } });

      const response = await service.getCoreMerchantAccountConfiguration('m-1');

      expect(httpService.get).toHaveBeenCalledWith('http://core-merchant/account/configuration/m-1');
      expect(response).toEqual({ paymentTerm: 'PREPAID' });
    });
  });

  describe('getMerchantDetailsById', () => {
    it('returns merged merchant and configuration', async () => {
      const merchant = { dataValues: { id: 'm1', name: 'M' }, paymentPlan: null };
      merchantModel.findByPk.mockResolvedValue(merchant);
      httpService.get.mockResolvedValue({ data: { data: { paymentTerm: 'PREPAID' } } });
      merchantConfigurationService.getMerchantConfigurationByMerchantId.mockResolvedValue({
        dataValues: { key: 'val' },
      });

      const result = await service.getMerchantDetailsById('m1');

      expect(result).toMatchObject({ id: 'm1', name: 'M', key: 'val' });
      expect(merchant.paymentPlan).toBe('PREPAID');
    });

    it('throws when merchant not found', async () => {
      merchantModel.findByPk.mockResolvedValue(null);

      await expect(service.getMerchantDetailsById('m1')).rejects.toThrow(HttpException);
    });
  });

  describe('getMerchant', () => {
    it('returns merchant with offer and configuration', async () => {
      const merchant = makeMerchant();
      merchantModel.findByPk.mockResolvedValue(merchant);
      httpService.get
        .mockResolvedValueOnce({ data: { paymentTerm: 'PREPAID' } })
        .mockResolvedValueOnce({ data: { data: { offers: [] } } });
      merchantConfigurationService.getMerchantConfigurationByMerchantId.mockResolvedValue({ config: true });

      const result = await service.getMerchant('m1');

      expect(result).toMatchObject({
        merchant,
        merchantOffer: { offers: [] },
        merchantConfiguration: { config: true },
      });
      expect(httpService.get).toHaveBeenCalledWith('http://merchant-offer/m1');
    });
  });

  describe('getAllMerchants', () => {
    it('delegates to groupMerchantService', async () => {
      const filters = {} as any;
      const sortDto = {} as any;
      const paginationDto = {} as any;
      groupMerchantService.getAllMerchants.mockResolvedValue({ data: [], pagination: {} });

      const result = await service.getAllMerchants(filters, sortDto, paginationDto);

      expect(groupMerchantService.getAllMerchants).toHaveBeenCalledWith(filters, sortDto, paginationDto, null, null);
      expect(result).toEqual({ data: [], pagination: {} });
    });
  });

  describe('createMerchantWithUserFromCRM', () => {
    it('delegates to MerchantCrmService', async () => {
      const dto = { merchantName: 'Demo Merchant' } as any;

      await service.createMerchantWithUserFromCRM(dto);

      expect(merchantCrmService.createMerchantWithUserFromCRM).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateMerchant', () => {
    const updateDto = {
      name: 'Updated',
      groupId: 'g1',
      country: 'UAE',
      city: 'Dubai',
      filterIds: ['f1'],
      excludedFilterIds: ['f2'],
    } as any;

    it('throws when merchant not found', async () => {
      merchantModel.findByPk.mockResolvedValue(null);

      await expect(service.updateMerchant('m1', updateDto, {}, 'user1')).rejects.toThrow(HttpException);
    });

    it('throws when group not found', async () => {
      merchantModel.findByPk.mockResolvedValue(makeMerchant());
      (Group.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.updateMerchant('m1', updateDto, {}, 'user1')).rejects.toThrow(HttpException);
    });

    it('throws when filters not found', async () => {
      merchantModel.findByPk.mockResolvedValue(makeMerchant());
      (Group.findOne as jest.Mock).mockResolvedValue({ id: 'g1' });
      (Filter.findAndCountAll as jest.Mock).mockResolvedValue({ count: 1 });

      await expect(service.updateMerchant('m1', updateDto, {}, 'user1')).rejects.toThrow(HttpException);
    });

    it('throws when merchant already registered with group (isModified)', async () => {
      merchantModel.findByPk.mockResolvedValue(makeMerchant());
      (Group.findOne as jest.Mock).mockResolvedValue({ id: 'g1' });
      (Filter.findAndCountAll as jest.Mock).mockResolvedValue({ count: 2 });
      merchantModel.findOne.mockResolvedValue({ id: 'existing' });

      await expect(service.updateMerchant('m1', { ...updateDto, isModified: true }, {}, 'user1')).rejects.toThrow(
        HttpException
      );
    });

    it('updates merchant successfully', async () => {
      const merchant = makeMerchant();
      merchantModel.findByPk.mockResolvedValue(merchant);
      merchantModel.update.mockResolvedValue([1, [merchant]]);
      (Group.findOne as jest.Mock).mockResolvedValue({ id: 'g1' });
      (Filter.findAndCountAll as jest.Mock).mockResolvedValue({ count: 2 });
      merchant.reload.mockResolvedValue(merchant);
      merchant.get.mockReturnValue({ merchantId: 'm1' });

      const result = await service.updateMerchant('m1', updateDto, { currencyid: 'cur1' }, 'user1');

      expect(sequelize.transaction).toHaveBeenCalled();
      expect(merchantCrmService.updateCircleMerchant).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('runs background operations when isCircle changes to false', async () => {
      const merchant = makeMerchant();
      merchantModel.findByPk.mockResolvedValue(merchant);
      merchantModel.update.mockResolvedValue([1, [merchant]]);
      (Group.findOne as jest.Mock).mockResolvedValue({ id: 'g1' });
      (Filter.findAndCountAll as jest.Mock).mockResolvedValue({ count: 2 });
      merchant.reload.mockResolvedValue(merchant);
      merchant.get.mockReturnValue({ merchantId: 'm1' });

      const setImmediateSpy = jest.spyOn(global, 'setImmediate').mockImplementation((cb: () => void) => {
        void Promise.resolve().then(() => (cb as any)());
        return 0 as any;
      });

      await service.updateMerchant('m1', { ...updateDto, isCircle: false }, {}, 'user1');
      await new Promise(r => setTimeout(r, 10));

      expect(setImmediateSpy).toHaveBeenCalled();
      expect(outletService.updateMerchantMetadataToOutlet).toHaveBeenCalled();
      expect(outletService.updateOutletsStatus).toHaveBeenCalled();
      setImmediateSpy.mockRestore();
    });

    it('logs error when background operations fail', async () => {
      const merchant = makeMerchant();
      merchantModel.findByPk.mockResolvedValue(merchant);
      merchantModel.update.mockResolvedValue([1, [merchant]]);
      (Group.findOne as jest.Mock).mockResolvedValue({ id: 'g1' });
      (Filter.findAndCountAll as jest.Mock).mockResolvedValue({ count: 2 });
      merchant.reload.mockResolvedValue(merchant);
      merchant.get.mockReturnValue({ merchantId: 'm1' });
      outletService.updateMerchantMetadataToOutlet.mockRejectedValue(new Error('outlet update failed'));

      const setImmediateSpy = jest.spyOn(global, 'setImmediate').mockImplementation((cb: () => void) => {
        void Promise.resolve().then(() => (cb as any)());
        return 0 as any;
      });

      await service.updateMerchant('m1', { ...updateDto, isCircle: false }, {}, 'user1');
      await new Promise(r => setTimeout(r, 20));

      expect(logger.error).toHaveBeenCalledWith('updateMerchant background operations error', expect.any(Object));
      setImmediateSpy.mockRestore();
    });
  });

  describe('updateMerchantStatus', () => {
    it('throws when merchant not found', async () => {
      merchantModel.findByPk.mockResolvedValue(null);

      await expect(service.updateMerchantStatus('m1', true, 'token', 'user1')).rejects.toThrow(HttpException);
    });

    it('throws when activating without active offer', async () => {
      const merchant = makeMerchant();
      merchantModel.findByPk.mockResolvedValue(merchant);
      httpService.get.mockResolvedValue({ data: { data: [{ user: { isRegistered: true } }] } });
      offerServiceProxy.checkMerchantHasActiveOffer.mockResolvedValue(false);

      await expect(service.updateMerchantStatus('m1', true, 'token', 'user1')).rejects.toThrow(HttpException);
    });

    it('activates merchant when has offer and can activate', async () => {
      const merchant = makeMerchant();
      merchantModel.findByPk.mockResolvedValue(merchant);
      httpService.get.mockResolvedValue({ data: { data: [{ user: { isRegistered: true } }] } });
      offerServiceProxy.checkMerchantHasActiveOffer.mockResolvedValue(true);

      await service.updateMerchantStatus('m1', true, 'token', 'user1');

      expect(merchant.update).toHaveBeenCalledWith({ status: MerchantStatusEnum.ACTIVE, updatedBy: 'user1' });
      expect(dataOperationsProducer.pushToAuditLogService).toHaveBeenCalled();
    });

    it('deactivates to PENDING when canActivateMerchant returns false', async () => {
      const merchant = makeMerchant({ city: '', filters: [] });
      merchantModel.findByPk.mockResolvedValue(merchant);
      httpService.get.mockResolvedValue({ data: { data: [] } });

      await service.updateMerchantStatus('m1', false, 'token', 'user1');

      expect(merchant.update).toHaveBeenCalledWith(
        { status: MerchantStatusEnum.PENDING, updatedBy: 'user1' },
        expect.any(Object)
      );
      expect(outletService.updateOutletsStatus).toHaveBeenCalled();
    });

    it('uses empty merchantAdmin when getMerchantAdminUserData fails', async () => {
      const merchant = makeMerchant();
      merchantModel.findByPk.mockResolvedValue(merchant);
      httpService.get.mockRejectedValue(new Error('identity api down'));

      await service.updateMerchantStatus('m1', false, 'token', 'user1');

      expect(merchant.update).toHaveBeenCalledWith(
        { status: MerchantStatusEnum.PENDING, updatedBy: 'user1' },
        expect.any(Object)
      );
    });

    it('deactivates to DISABLED when canActivateMerchant returns true', async () => {
      const merchant = makeMerchant();
      merchantModel.findByPk.mockResolvedValue(merchant);
      httpService.get.mockResolvedValue({ data: { data: [{ user: { isRegistered: true } }] } });

      await service.updateMerchantStatus('m1', false, 'token', 'user1');

      expect(merchant.update).toHaveBeenCalledWith(
        { status: MerchantStatusEnum.DISABLED, updatedBy: 'user1' },
        expect.any(Object)
      );
    });

    it('throws when updateMerchantProfileStatus fails', async () => {
      const merchant = makeMerchant();
      merchantModel.findByPk.mockResolvedValue(merchant);
      httpService.get.mockResolvedValue({ data: { data: [{ user: { isRegistered: true } }] } });
      merchantProfile.update.mockRejectedValue(new Error('profile update failed'));

      await expect(service.updateMerchantStatus('m1', false, 'token', 'user1')).rejects.toThrow(HttpException);
      expect(logger.error).toHaveBeenCalledWith('MerchantService.updateMerchantProfileStatus failed ', expect.any(Object));
    });
  });

  describe('updateMerchantStatusRewardEngine', () => {
    it('uses reward engine for offer check', async () => {
      const merchant = makeMerchant();
      merchantModel.findByPk.mockResolvedValue(merchant);
      httpService.get.mockResolvedValue({ data: { data: [{ user: { isRegistered: true } }] } });
      rewardEngineWrapperProxy.checkMerchantHasActiveOffer.mockResolvedValue(true);

      await service.updateMerchantStatusRewardEngine('m1', true, 'token', 'user1');

      expect(rewardEngineWrapperProxy.checkMerchantHasActiveOffer).toHaveBeenCalledWith('m1', 'token');
    });
  });

  describe('sendFirstActivationEmail', () => {
    it('returns early when email already sent', async () => {
      const merchant = makeMerchant({ isFirstActivationEmailSent: true });

      const result = await service.sendFirstActivationEmail(merchant as any);

      expect(merchantIdentityProxy.sendMerchantLiveEmail).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('sends email and marks sent when response', async () => {
      const merchant = makeMerchant({ id: 'm1', isFirstActivationEmailSent: false });
      merchantIdentityProxy.sendMerchantLiveEmail.mockResolvedValue({ success: true });

      const result = await service.sendFirstActivationEmail(merchant as any);

      expect(merchantIdentityProxy.sendMerchantLiveEmail).toHaveBeenCalledWith({
        merchantId: 'm1',
        type: 'MERCHANT_LIVE',
      });
      expect(merchant.save).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('returns false on exception', async () => {
      const merchant = makeMerchant({ id: 'm1' });
      merchantIdentityProxy.sendMerchantLiveEmail.mockRejectedValue(new Error('fail'));

      const result = await service.sendFirstActivationEmail(merchant as any);

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('updateMerchantFastPaymentStatus', () => {
    it('throws when merchant not found', async () => {
      merchantModel.findByPk.mockResolvedValue(null);

      await expect(service.updateMerchantFastPaymentStatus('m1', true, {}, 'user1')).rejects.toThrow(HttpException);
    });

    it('throws when validateMerchant fails (maxOfferValue > 0 and status not ACTIVE)', async () => {
      const merchant = makeMerchant({ maxOfferValue: 10, status: MerchantStatusEnum.PENDING });
      merchantModel.findByPk.mockResolvedValue(merchant);
      httpService.get.mockResolvedValue({ data: { data: [{ user: { isRegistered: true } }] } });

      await expect(service.updateMerchantFastPaymentStatus('m1', true, {}, 'user1')).rejects.toThrow(HttpException);
    });

    it('activates fast payment when can activate', async () => {
      const merchant = makeMerchant({ maxOfferValue: 0, status: MerchantStatusEnum.ACTIVE });
      merchantModel.findByPk.mockResolvedValue(merchant);
      httpService.get.mockResolvedValue({ data: { data: [{ user: { isRegistered: true } }] } });

      await service.updateMerchantFastPaymentStatus('m1', true, {}, 'user1');

      expect(merchant.update).toHaveBeenCalledWith({
        fastPaymentStatus: MerchantStatusEnum.ACTIVE,
        isCircle: true,
        updatedBy: 'user1',
      });
      expect(merchantCrmService.updateCircleMerchant).toHaveBeenCalled();
    });

    it('deactivates fast payment to PENDING', async () => {
      const merchant = makeMerchant({ fastPaymentStatus: MerchantStatusEnum.ACTIVE });
      merchantModel.findByPk.mockResolvedValue(merchant);
      httpService.get.mockResolvedValue({ data: { data: [] } });

      await service.updateMerchantFastPaymentStatus('m1', false, { authorization: 'bearer' }, 'user1');

      expect(merchant.update).toHaveBeenCalledWith({ fastPaymentStatus: MerchantStatusEnum.PENDING, updatedBy: 'user1' });
      expect(outletService.updateOutletsStatus).toHaveBeenCalled();
    });

    it('deactivates fast payment to DISABLED when canActivateMerchant true', async () => {
      const merchant = makeMerchant({ fastPaymentStatus: MerchantStatusEnum.ACTIVE });
      merchantModel.findByPk.mockResolvedValue(merchant);
      httpService.get.mockResolvedValue({ data: { data: [{ user: { isRegistered: true } }] } });

      await service.updateMerchantFastPaymentStatus('m1', false, {}, 'user1');

      expect(merchant.update).toHaveBeenCalledWith({ fastPaymentStatus: MerchantStatusEnum.DISABLED, updatedBy: 'user1' });
    });
  });

  describe('validateMerchant', () => {
    it('throws when maxOfferValue > 0 and status not ACTIVE', () => {
      const merchant = { maxOfferValue: 10, status: MerchantStatusEnum.PENDING } as any;

      expect(() => service.validateMerchant(merchant)).toThrow(HttpException);
    });

    it('does not throw when valid', () => {
      const merchant = { maxOfferValue: 0, status: MerchantStatusEnum.PENDING } as any;

      expect(() => service.validateMerchant(merchant)).not.toThrow();
    });
  });

  describe('updateMerchantOutletsNumber', () => {
    it('throws when merchant not found', async () => {
      merchantModel.findByPk.mockResolvedValue(null);

      await expect(
        service.updateMerchantOutletsNumber('m1', { activeOutletsNum: 5, inActiveOutletsNum: 2 } as any)
      ).rejects.toThrow(HttpException);
    });

    it('updates outlet numbers', async () => {
      merchantModel.findByPk.mockResolvedValue(makeMerchant());

      await service.updateMerchantOutletsNumber('m1', { activeOutletsNum: 5, inActiveOutletsNum: 2 } as any);

      expect(merchantModel.update).toHaveBeenCalledWith(
        { activeOutletsNum: 5, inActiveOutletsNum: 2 },
        { where: { id: 'm1' } }
      );
    });
  });

  describe('getSalesOwners', () => {
    it('returns sales owners with pagination', async () => {
      merchantModel.findAndCountAll.mockResolvedValue({
        rows: [{ sales_person: 'Alice' }, { sales_person: 'Bob' }],
        count: 2,
      });

      const result = await service.getSalesOwners({ page: 1, limit: 10 }, 'UAE');

      expect(merchantModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { country: 'UAE' },
          offset: 0,
          limit: 10,
        })
      );
      expect(result.data).toHaveLength(2);
      expect(result.pagination).toBeDefined();
    });

    it('omits country filter when not provided', async () => {
      merchantModel.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await service.getSalesOwners({ page: 1, limit: 10 }, '');

      expect(merchantModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      );
    });
  });

  describe('canActivateMerchant', () => {
    it('returns false when required fields missing', () => {
      const canActivate = service.canActivateMerchant({ city: '', name: '', country: '', filters: [] } as any, false, []);
      expect(canActivate).toBe(false);
    });

    it('throws when required fields missing and throwError', () => {
      expect(() => service.canActivateMerchant({ city: '', name: '', country: '', filters: [] } as any, true, [])).toThrow(
        HttpException
      );
    });

    it('returns false when filters empty', () => {
      const canActivate = service.canActivateMerchant(
        { city: 'Dubai', name: 'M', country: 'UAE', filters: [] } as any,
        false,
        [{ user: { isRegistered: true } }]
      );
      expect(canActivate).toBe(false);
    });

    it('throws when filters empty and throwError', () => {
      expect(() =>
        service.canActivateMerchant({ city: 'Dubai', name: 'M', country: 'UAE', filters: [] } as any, true, [
          { user: { isRegistered: true } },
        ])
      ).toThrow(HttpException);
    });

    it('returns false when merchant admin not activated', () => {
      const canActivate = service.canActivateMerchant(
        { city: 'Dubai', name: 'M', country: 'UAE', filters: [{ id: 'f1' }] } as any,
        false,
        []
      );
      expect(canActivate).toBe(false);
    });

    it('throws when merchant admin not registered and throwError', () => {
      expect(() =>
        service.canActivateMerchant({ city: 'Dubai', name: 'M', country: 'UAE', filters: [{ id: 'f1' }] } as any, true, [
          { user: { isRegistered: false } },
        ])
      ).toThrow(HttpException);
    });

    it('returns true when data is valid', () => {
      const merchant = {
        city: 'Dubai',
        name: 'Merchant A',
        country: 'UAE',
        filters: [{ id: 'f1' }],
      } as any;

      const canActivate = service.canActivateMerchant(merchant, false, [{ user: { isRegistered: true } }]);
      expect(canActivate).toBe(true);
    });
  });

  describe('updateMerchantPaymentType', () => {
    it('updates payment plan', async () => {
      merchantModel.update.mockResolvedValue([1]);

      await service.updateMerchantPaymentType('m1', MerchantPaymentPlanEnum.PREPAID, 'user1');

      expect(merchantModel.update).toHaveBeenCalledWith(
        { paymentPlan: MerchantPaymentPlanEnum.PREPAID, updatedBy: 'user1' },
        { where: { id: 'm1' } }
      );
    });
  });

  describe('getGroupIdsByMerchantIds', () => {
    it('returns group IDs by merchant IDs', async () => {
      merchantModel.findAll.mockResolvedValue([{ merchantId: 'm1', groupId: 'g1' }]);

      const result = await service.getGroupIdsByMerchantIds(['m1', 'm2']);

      expect(merchantModel.findAll).toHaveBeenCalledWith({
        where: { id: { [Op.in]: ['m1', 'm2'] } },
        attributes: [['id', 'merchantId'], 'groupId'],
      });
      expect(result).toEqual([{ merchantId: 'm1', groupId: 'g1' }]);
    });
  });

  describe('updateMaxOffer', () => {
    it('updates max offer values for valid rows', async () => {
      const offers = [
        { merchantId: 'm1', maxOfferValue: 10 },
        { merchantId: 'm2', maxOfferValue: 25 },
      ];

      await service.updateMaxOffer(offers);

      expect(merchantModel.update).toHaveBeenCalledTimes(2);
      expect(merchantModel.update).toHaveBeenNthCalledWith(1, { maxOfferValue: 10 }, { where: { id: 'm1' } });
      expect(merchantModel.update).toHaveBeenNthCalledWith(2, { maxOfferValue: 25 }, { where: { id: 'm2' } });
    });

    it('skips invalid offers', async () => {
      await service.updateMaxOffer([
        { merchantId: '', maxOfferValue: 10 },
        { merchantId: 'm2', maxOfferValue: undefined as any },
      ]);

      expect(merchantModel.update).not.toHaveBeenCalled();
    });

    it('throws HttpException when updateMaxOffer fails', async () => {
      merchantModel.update.mockRejectedValue(new Error('db down'));

      await expect(service.updateMaxOffer([{ merchantId: 'm1', maxOfferValue: 10 }])).rejects.toThrow(HttpException);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getMerchantNames', () => {
    it('returns merchant names', async () => {
      merchantModel.findAll.mockResolvedValue([{ id: 'm1', name: 'Merchant 1' }]);

      const result = await service.getMerchantNames(['m1', 'm2']);

      expect(merchantModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { [Op.in]: ['m1', 'm2'] } },
        })
      );
      expect(result).toEqual([{ id: 'm1', name: 'Merchant 1' }]);
    });

    it('throws on error', async () => {
      merchantModel.findAll.mockRejectedValue(new Error('db error'));

      await expect(service.getMerchantNames(['m1'])).rejects.toThrow(HttpException);
    });
  });

  describe('updateMerchantStatusById', () => {
    it('updates status', async () => {
      merchantModel.update.mockResolvedValue([1]);

      const result = await service.updateMerchantStatusById({ merchantId: 'm1', status: 'ACTIVE' } as any);

      expect(merchantModel.update).toHaveBeenCalledWith({ status: 'ACTIVE' }, { where: { id: 'm1' }, returning: false });
      expect(result).toBe(true);
    });

    it('throws on error', async () => {
      merchantModel.update.mockRejectedValue(new Error('db error'));

      await expect(service.updateMerchantStatusById({ merchantId: 'm1', status: 'ACTIVE' } as any)).rejects.toThrow(
        HttpException
      );
    });
  });

  describe('getMerchantDataById', () => {
    it('returns merchant by id', async () => {
      const merchant = makeMerchant();
      merchantModel.findByPk.mockResolvedValue(merchant);

      const result = await service.getMerchantDataById('m1');

      expect(merchantModel.findByPk).toHaveBeenCalledWith('m1');
      expect(result).toBe(merchant);
    });

    it('throws on error', async () => {
      merchantModel.findByPk.mockRejectedValue(new Error('db error'));

      await expect(service.getMerchantDataById('m1')).rejects.toThrow(HttpException);
    });
  });

  describe('getOutletLinksByUserId', () => {
    it('returns empty when userId is empty', async () => {
      const result = await service.getOutletLinksByUserId('');

      expect(result).toEqual({ linkedOutlets: [] });
      expect(merchantIdentityProxy.outletUserLinks).not.toHaveBeenCalled();
    });

    it('returns linked outlets', async () => {
      merchantIdentityProxy.outletUserLinks.mockResolvedValue([{ outletId: 'o1', merchantId: 'm1' }]);
      (Outlet.findAll as jest.Mock).mockResolvedValue([
        { outletId: 'o1', merchantId: 'm1', merchantName: 'M1', name: 'Outlet 1' },
      ]);

      const result = await service.getOutletLinksByUserId('user1');

      expect(merchantIdentityProxy.outletUserLinks).toHaveBeenCalledWith('user1');
      expect(result.linkedOutlets).toHaveLength(1);
      expect(result.linkedOutlets[0]).toMatchObject({
        outletId: 'o1',
        merchantId: 'm1',
        merchantName: 'M1',
        outletName: 'Outlet 1',
      });
    });

    it('throws on error', async () => {
      merchantIdentityProxy.outletUserLinks.mockRejectedValue(new Error('api error'));

      await expect(service.getOutletLinksByUserId('user1')).rejects.toThrow(HttpException);
    });
  });

  describe('getActiveFabMerchants', () => {
    it('returns active FAB merchants', async () => {
      const merchants = [{ id: 'm1' }];
      merchantModel.findAll.mockResolvedValue(merchants);

      const result = await service.getActiveFabMerchants(['m1', 'm2'], 'profile-1');

      expect(merchantModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: MerchantStatusEnum.ACTIVE, id: { [Op.in]: ['m1', 'm2'] } },
        })
      );
      expect(result).toEqual(merchants);
    });

    it('throws on error', async () => {
      merchantModel.findAll.mockRejectedValue(new Error('db error'));

      await expect(service.getActiveFabMerchants(['m1'], 'p1')).rejects.toThrow();
    });
  });
});
