import { HttpException, NotFoundException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { EnvKeysEnum } from 'config/env.enum';
import { OutletStatusService } from '../outlet-status.service';
import { OutletStatusEnum } from 'src/outlet/enums/outlet-status-enum';
import { UploadOutletStatusDto } from 'src/outlet/dtos/update-status-dto';
import { OutletFastPaymentStatusDto } from 'src/outlet/dtos/fast-payment-status.dto';
import { OutletFastPaymentStatusEnum } from 'src/outlet/enums/outlet-status-enum';
import { MerchantStatusUpdatedDto } from 'src/outlet/dtos/merchant-status-dto';

describe('OutletStatusService', () => {
  const outletModel = { findOne: jest.fn(), findAll: jest.fn(), update: jest.fn() } as any;
  const outletGetService = {
    getMerchantId: jest.fn(),
    getOutletDetails: jest.fn(),
    getOutletDetailsRewardEngine: jest.fn(),
    getOutlet: jest.fn(),
  } as any;
  const outletAddressService = { find: jest.fn() } as any;
  const merchantService = { getMerchantById: jest.fn() } as any;
  const schemeServiceProxy = {
    getSchemeTransactionServiceStatus: jest.fn(),
    getSchemeTransactionEnableOutlet: jest.fn(),
    getSchemeTransactionDisableOutlet: jest.fn(),
  } as any;
  const mastercardSchemeServiceProxy = {
    getSchemeTransactionServiceStatus: jest.fn(),
    getSchemeTransactionEnableOutlet: jest.fn(),
    getSchemeTransactionDisableOutlet: jest.fn(),
  } as any;
  const fastPaymentServiceProxy = {
    getCircleMerchantMetadata: jest.fn(),
    upsertFastPaymentStatus: jest.fn(),
    getOutletTabs: jest.fn(),
    getOutletPriceConfig: jest.fn(),
  } as any;
  const posServiceProxy = { getPosConfig: jest.fn() } as any;
  const searchServiceProxy = { updateOutletStatus: jest.fn() } as any;
  const outletProducer = { pushToKafka: jest.fn() } as any;
  const moEngageProxy = { postOutletActive: jest.fn() } as any;
  const logger = { info: jest.fn(), error: jest.fn() } as any;

  let service: OutletStatusService;

  const mockSideEffects = {
    pushOutletToFinance: jest.fn().mockResolvedValue(undefined),
    pushOutletActiveStatusToKafka: jest.fn().mockResolvedValue(undefined),
    pushNodeStatusToAuditLog: jest.fn().mockResolvedValue(undefined),
    updateOutletCountByMerchant: jest.fn().mockResolvedValue(undefined),
  };

  const baseActiveOutletDetails = () => ({
    outletPhotos: [{ isDefault: true, cdnUrl: 'https://hero' }],
    outletFilters: [{}],
    outletProfileMetadata: { profileId: 'p1' },
    outletNo: 'ON1',
    name: 'Outlet',
    outletNormalOffer: {},
  });

  const baseValidAddress = () => ({
    areaId: 'area-1',
    neighbourhoodId: 'n1',
    latitude: 1,
    longitude: 1,
    location: 'loc',
    neighbourhood: { area: { areaName: 'City' } },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.KAFKA_NOTIFICATION_TOPIC = 'notif-topic';
    process.env[EnvKeysEnum.E_COMMERCE_AREA_ID] = 'ecom-area';
    service = new OutletStatusService(
      outletModel,
      outletGetService,
      outletAddressService,
      merchantService,
      schemeServiceProxy,
      mastercardSchemeServiceProxy,
      fastPaymentServiceProxy,
      posServiceProxy,
      searchServiceProxy,
      outletProducer,
      moEngageProxy,
      logger
    );
  });

  describe('validateAndUpdateOutletStatus', () => {
    it('activates outlet and runs side effects', async () => {
      const data: UploadOutletStatusDto = { outletId: 'o1', status: OutletStatusEnum.Active };
      const token = {};
      const outletDetails = {
        outletPhotos: [{ isDefault: true, cdnUrl: 'url' }],
        outletFilters: [{}],
        outletProfileMetadata: { profileId: 'p1' },
        outletNo: 'ON1',
        name: 'Outlet',
      };
      const outletAddress = {
        areaId: 'a',
        neighbourhoodId: 'n',
        latitude: 1,
        longitude: 1,
        location: 'l',
        neighbourhood: { area: { areaName: 'City' } },
      };
      const merchantData = { status: 'ACTIVE' };
      const updatedOutlet = { outletId: 'o1', status: OutletStatusEnum.Active };

      outletGetService.getMerchantId.mockResolvedValue({ merchantId: 'm1' });
      outletGetService.getOutletDetails.mockResolvedValue(outletDetails);
      outletGetService.getOutlet.mockResolvedValue({ status: OutletStatusEnum.Pending });
      outletAddressService.find.mockResolvedValue(outletAddress);
      merchantService.getMerchantById.mockResolvedValue(merchantData);
      schemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });
      schemeServiceProxy.getSchemeTransactionEnableOutlet.mockResolvedValue({ data: { data: { disableMerchant: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionEnableOutlet.mockResolvedValue({
        data: { data: { disableMerchant: true } },
      });
      outletModel.update.mockResolvedValue([1, [updatedOutlet]]);

      const result = await service.validateAndUpdateOutletStatus(data, token, 'user1', mockSideEffects);

      expect(result).toEqual(updatedOutlet);
      expect(mockSideEffects.pushOutletToFinance).toHaveBeenCalled();
      expect(mockSideEffects.pushOutletActiveStatusToKafka).toHaveBeenCalled();
      expect(mockSideEffects.pushNodeStatusToAuditLog).toHaveBeenCalled();
      expect(mockSideEffects.updateOutletCountByMerchant).toHaveBeenCalledWith('m1');
    });

    it('deactivates from active and validates visa/mastercard disabled', async () => {
      const data: UploadOutletStatusDto = { outletId: 'o1', status: OutletStatusEnum.Pending };
      const outletDetails = {
        outletPhotos: [{ isDefault: true }],
        outletFilters: [],
        outletProfileMetadata: { profileId: 'p1' },
        outletNo: 'ON1',
        name: 'Outlet',
      };
      const updatedOutlet = { outletId: 'o1', status: OutletStatusEnum.Pending };

      outletGetService.getMerchantId.mockResolvedValue({ merchantId: 'm1' });
      outletGetService.getOutletDetails.mockResolvedValue(outletDetails);
      outletGetService.getOutlet.mockResolvedValue({ status: OutletStatusEnum.Active });
      outletAddressService.find.mockResolvedValue({});
      merchantService.getMerchantById.mockResolvedValue({ status: 'ACTIVE' });
      schemeServiceProxy.getSchemeTransactionDisableOutlet.mockResolvedValue({ data: { data: { disableMerchant: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionDisableOutlet.mockResolvedValue({
        data: { data: { disableMerchant: true } },
      });
      outletModel.update.mockResolvedValue([1, [updatedOutlet]]);

      const result = await service.validateAndUpdateOutletStatus(data, {}, 'user1', mockSideEffects);

      expect(result).toEqual(updatedOutlet);
      expect(schemeServiceProxy.getSchemeTransactionDisableOutlet).toHaveBeenCalledWith('o1', {});
    });

    it('throws NotFoundException when status update affects no rows', async () => {
      const data: UploadOutletStatusDto = { outletId: 'o-missing', status: OutletStatusEnum.Pending };
      const outletDetails = {
        outletPhotos: [{ isDefault: true }],
        outletFilters: [],
        outletProfileMetadata: { profileId: 'p1' },
        outletNo: 'ON1',
        name: 'Outlet',
      };

      outletGetService.getMerchantId.mockResolvedValue({ merchantId: 'm1' });
      outletGetService.getOutletDetails.mockResolvedValue(outletDetails);
      outletGetService.getOutlet.mockResolvedValue({ status: OutletStatusEnum.Pending });
      outletAddressService.find.mockResolvedValue({});
      merchantService.getMerchantById.mockResolvedValue({ status: 'ACTIVE' });
      outletModel.update.mockResolvedValue([0, []]);

      await expect(service.validateAndUpdateOutletStatus(data, {}, 'user1', mockSideEffects)).rejects.toThrow(
        NotFoundException
      );
    });

    it('throws when merchant is not active during activation', async () => {
      const data: UploadOutletStatusDto = { outletId: 'o1', status: OutletStatusEnum.Active };

      outletGetService.getMerchantId.mockResolvedValue({ merchantId: 'm1' });
      outletGetService.getOutletDetails.mockResolvedValue(baseActiveOutletDetails());
      outletGetService.getOutlet.mockResolvedValue({});
      outletAddressService.find.mockResolvedValue(baseValidAddress());
      merchantService.getMerchantById.mockResolvedValue({ status: 'INACTIVE' });
      schemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });

      await expect(service.validateAndUpdateOutletStatus(data, {}, 'user1', mockSideEffects)).rejects.toThrow(
        'Merchant is not active!'
      );
    });

    it('throws when hero image is missing on activation', async () => {
      const data: UploadOutletStatusDto = { outletId: 'o1', status: OutletStatusEnum.Active };
      const details = { ...baseActiveOutletDetails(), outletPhotos: [{ isDefault: false }] };

      outletGetService.getMerchantId.mockResolvedValue({ merchantId: 'm1' });
      outletGetService.getOutletDetails.mockResolvedValue(details);
      outletGetService.getOutlet.mockResolvedValue({});
      outletAddressService.find.mockResolvedValue(baseValidAddress());
      merchantService.getMerchantById.mockResolvedValue({ status: 'ACTIVE' });
      schemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });

      await expect(service.validateAndUpdateOutletStatus(data, {}, 'user1', mockSideEffects)).rejects.toThrow(
        'Please upload hero image!'
      );
    });

    it('throws when outlet category is missing on activation', async () => {
      const data: UploadOutletStatusDto = { outletId: 'o1', status: OutletStatusEnum.Active };
      const details = { ...baseActiveOutletDetails(), outletFilters: null };

      outletGetService.getMerchantId.mockResolvedValue({ merchantId: 'm1' });
      outletGetService.getOutletDetails.mockResolvedValue(details);
      outletGetService.getOutlet.mockResolvedValue({});
      outletAddressService.find.mockResolvedValue(baseValidAddress());
      merchantService.getMerchantById.mockResolvedValue({ status: 'ACTIVE' });
      schemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });

      await expect(service.validateAndUpdateOutletStatus(data, {}, 'user1', mockSideEffects)).rejects.toThrow(
        'Please select outlet category!'
      );
    });

    it('throws when offer path has no offers configured', async () => {
      const data: UploadOutletStatusDto = { outletId: 'o1', status: OutletStatusEnum.Active };
      const details = {
        ...baseActiveOutletDetails(),
        outletNormalOffer: null,
        outletCustomHours: [],
        outletTieredOffers: null,
      };

      outletGetService.getMerchantId.mockResolvedValue({ merchantId: 'm1' });
      outletGetService.getOutletDetails.mockResolvedValue(details);
      outletGetService.getOutlet.mockResolvedValue({});
      outletAddressService.find.mockResolvedValue(baseValidAddress());
      merchantService.getMerchantById.mockResolvedValue({ status: 'ACTIVE' });
      schemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });

      await expect(service.validateAndUpdateOutletStatus(data, {}, 'user1', mockSideEffects)).rejects.toThrow(
        'Please create outlet offer!'
      );
    });

    it('throws when outlet is not live on Visa', async () => {
      const data: UploadOutletStatusDto = { outletId: 'o1', status: OutletStatusEnum.Active };

      outletGetService.getMerchantId.mockResolvedValue({ merchantId: 'm1' });
      outletGetService.getOutletDetails.mockResolvedValue(baseActiveOutletDetails());
      outletGetService.getOutlet.mockResolvedValue({});
      outletAddressService.find.mockResolvedValue(baseValidAddress());
      merchantService.getMerchantById.mockResolvedValue({ status: 'ACTIVE' });
      schemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: false } } });
      mastercardSchemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });

      await expect(service.validateAndUpdateOutletStatus(data, {}, 'user1', mockSideEffects)).rejects.toThrow(
        'Outlet is not active on visa!'
      );
    });

    it('throws when outlet is not live on Mastercard', async () => {
      const data: UploadOutletStatusDto = { outletId: 'o1', status: OutletStatusEnum.Active };

      outletGetService.getMerchantId.mockResolvedValue({ merchantId: 'm1' });
      outletGetService.getOutletDetails.mockResolvedValue(baseActiveOutletDetails());
      outletGetService.getOutlet.mockResolvedValue({});
      outletAddressService.find.mockResolvedValue(baseValidAddress());
      merchantService.getMerchantById.mockResolvedValue({ status: 'ACTIVE' });
      schemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({
        data: { data: { isLive: false } },
      });

      await expect(service.validateAndUpdateOutletStatus(data, {}, 'user1', mockSideEffects)).rejects.toThrow(
        'Outlet is not active on mastercard!'
      );
    });

    it('throws when Visa enable check fails after both schemes are live', async () => {
      const data: UploadOutletStatusDto = { outletId: 'o1', status: OutletStatusEnum.Active };

      outletGetService.getMerchantId.mockResolvedValue({ merchantId: 'm1' });
      outletGetService.getOutletDetails.mockResolvedValue(baseActiveOutletDetails());
      outletGetService.getOutlet.mockResolvedValue({});
      outletAddressService.find.mockResolvedValue(baseValidAddress());
      merchantService.getMerchantById.mockResolvedValue({ status: 'ACTIVE' });
      schemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });
      schemeServiceProxy.getSchemeTransactionEnableOutlet.mockResolvedValue({ data: { data: { disableMerchant: false } } });
      mastercardSchemeServiceProxy.getSchemeTransactionEnableOutlet.mockResolvedValue({
        data: { data: { disableMerchant: true } },
      });

      await expect(service.validateAndUpdateOutletStatus(data, {}, 'user1', mockSideEffects)).rejects.toThrow(
        'Outlet is not enabled on visa!'
      );
    });

    it('throws when Mastercard enable check fails after both schemes are live', async () => {
      const data: UploadOutletStatusDto = { outletId: 'o1', status: OutletStatusEnum.Active };

      outletGetService.getMerchantId.mockResolvedValue({ merchantId: 'm1' });
      outletGetService.getOutletDetails.mockResolvedValue(baseActiveOutletDetails());
      outletGetService.getOutlet.mockResolvedValue({});
      outletAddressService.find.mockResolvedValue(baseValidAddress());
      merchantService.getMerchantById.mockResolvedValue({ status: 'ACTIVE' });
      schemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });
      schemeServiceProxy.getSchemeTransactionEnableOutlet.mockResolvedValue({ data: { data: { disableMerchant: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionEnableOutlet.mockResolvedValue({
        data: { data: { disableMerchant: false } },
      });

      await expect(service.validateAndUpdateOutletStatus(data, {}, 'user1', mockSideEffects)).rejects.toThrow(
        'Outlet is not enabled on mastercard!'
      );
    });

    it('throws when deactivating on Visa fails scheme check', async () => {
      const data: UploadOutletStatusDto = { outletId: 'o1', status: OutletStatusEnum.Pending };
      const outletDetails = {
        outletPhotos: [{ isDefault: true }],
        outletFilters: [],
        outletProfileMetadata: { profileId: 'p1' },
        outletNo: 'ON1',
        name: 'Outlet',
      };

      outletGetService.getMerchantId.mockResolvedValue({ merchantId: 'm1' });
      outletGetService.getOutletDetails.mockResolvedValue(outletDetails);
      outletGetService.getOutlet.mockResolvedValue({ status: OutletStatusEnum.Active });
      outletAddressService.find.mockResolvedValue({});
      merchantService.getMerchantById.mockResolvedValue({ status: 'ACTIVE' });
      schemeServiceProxy.getSchemeTransactionDisableOutlet.mockResolvedValue({ data: { data: { disableMerchant: false } } });

      await expect(service.validateAndUpdateOutletStatus(data, {}, 'user1', mockSideEffects)).rejects.toThrow(
        'Outlet is not disabled on visa!'
      );
    });

    it('throws when deactivating on Mastercard fails scheme check', async () => {
      const data: UploadOutletStatusDto = { outletId: 'o1', status: OutletStatusEnum.Pending };
      const outletDetails = {
        outletPhotos: [{ isDefault: true }],
        outletFilters: [],
        outletProfileMetadata: { profileId: 'p1' },
        outletNo: 'ON1',
        name: 'Outlet',
      };

      outletGetService.getMerchantId.mockResolvedValue({ merchantId: 'm1' });
      outletGetService.getOutletDetails.mockResolvedValue(outletDetails);
      outletGetService.getOutlet.mockResolvedValue({ status: OutletStatusEnum.Active });
      outletAddressService.find.mockResolvedValue({});
      merchantService.getMerchantById.mockResolvedValue({ status: 'ACTIVE' });
      schemeServiceProxy.getSchemeTransactionDisableOutlet.mockResolvedValue({ data: { data: { disableMerchant: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionDisableOutlet.mockResolvedValue({
        data: { data: { disableMerchant: false } },
      });

      await expect(service.validateAndUpdateOutletStatus(data, {}, 'user1', mockSideEffects)).rejects.toThrow(
        'Outlet is not disabled on mastercard!'
      );
    });

    it('deactivates from Active to Ready and validates schemes', async () => {
      const data: UploadOutletStatusDto = { outletId: 'o1', status: OutletStatusEnum.Ready };
      const outletDetails = {
        outletPhotos: [{ isDefault: true }],
        outletFilters: [],
        outletProfileMetadata: { profileId: 'p1' },
        outletNo: 'ON1',
        name: 'Outlet',
      };
      const updatedOutlet = { outletId: 'o1', status: OutletStatusEnum.Ready };

      outletGetService.getMerchantId.mockResolvedValue({ merchantId: 'm1' });
      outletGetService.getOutletDetails.mockResolvedValue(outletDetails);
      outletGetService.getOutlet.mockResolvedValue({ status: OutletStatusEnum.Active });
      outletAddressService.find.mockResolvedValue({});
      merchantService.getMerchantById.mockResolvedValue({ status: 'ACTIVE' });
      schemeServiceProxy.getSchemeTransactionDisableOutlet.mockResolvedValue({ data: { data: { disableMerchant: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionDisableOutlet.mockResolvedValue({
        data: { data: { disableMerchant: true } },
      });
      outletModel.update.mockResolvedValue([1, [updatedOutlet]]);

      const result = await service.validateAndUpdateOutletStatus(data, {}, 'user1', mockSideEffects);

      expect(result).toEqual(updatedOutlet);
    });
  });

  describe('validateAndUpdateOutletStatusRewardEngine', () => {
    it('uses reward engine outlet details', async () => {
      const data: UploadOutletStatusDto = { outletId: 'o1', status: OutletStatusEnum.Active };
      const outletDetails = {
        outletPhotos: [{ isDefault: true }],
        outletFilters: [{}],
        outletProfileMetadata: { profileId: 'p1' },
        outletNo: 'ON1',
        name: 'Outlet',
        offer: { rules: [{ id: 'r1' }] },
      };
      const outletAddress = {
        areaId: 'a',
        neighbourhoodId: 'n',
        latitude: 1,
        longitude: 1,
        location: 'l',
        neighbourhood: { area: { areaName: 'City' } },
      };

      outletGetService.getMerchantId.mockResolvedValue({ merchantId: 'm1' });
      outletGetService.getOutletDetailsRewardEngine.mockResolvedValue(outletDetails);
      outletGetService.getOutlet.mockResolvedValue({});
      outletAddressService.find.mockResolvedValue(outletAddress);
      merchantService.getMerchantById.mockResolvedValue({ status: 'ACTIVE' });
      schemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });
      schemeServiceProxy.getSchemeTransactionEnableOutlet.mockResolvedValue({ data: { data: { disableMerchant: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionEnableOutlet.mockResolvedValue({
        data: { data: { disableMerchant: true } },
      });
      outletModel.update.mockResolvedValue([1, [{ outletId: 'o1' }]]);

      await service.validateAndUpdateOutletStatusRewardEngine(data, {}, 'user1', mockSideEffects);

      expect(outletGetService.getOutletDetailsRewardEngine).toHaveBeenCalledWith('o1', {});
    });

    it('throws when reward rules are missing on activation', async () => {
      const data: UploadOutletStatusDto = { outletId: 'o1', status: OutletStatusEnum.Active };
      const outletDetails = {
        outletPhotos: [{ isDefault: true }],
        outletFilters: [{}],
        outletProfileMetadata: { profileId: 'p1' },
        outletNo: 'ON1',
        name: 'Outlet',
        offer: { rules: [] },
      };

      outletGetService.getMerchantId.mockResolvedValue({ merchantId: 'm1' });
      outletGetService.getOutletDetailsRewardEngine.mockResolvedValue(outletDetails);
      outletGetService.getOutlet.mockResolvedValue({});
      outletAddressService.find.mockResolvedValue(baseValidAddress());
      merchantService.getMerchantById.mockResolvedValue({ status: 'ACTIVE' });
      schemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });

      await expect(service.validateAndUpdateOutletStatusRewardEngine(data, {}, 'user1', mockSideEffects)).rejects.toThrow(
        'Please create outlet offer!'
      );
    });
  });

  describe('updateFastPaymentStatus', () => {
    it('throws when outlet not found', async () => {
      outletModel.findOne.mockResolvedValue(null);
      fastPaymentServiceProxy.getCircleMerchantMetadata.mockResolvedValue({});

      await expect(
        service.updateFastPaymentStatus(
          { merchantId: 'm1', outletId: 'o1', status: OutletFastPaymentStatusEnum.PENDING } as OutletFastPaymentStatusDto,
          {},
          'user1'
        )
      ).rejects.toThrow(HttpException);
    });

    it('updates outlet when upsert returns true and status is not ACTIVE', async () => {
      const outlet = { outletId: 'o1', fastPaymentStatus: OutletFastPaymentStatusEnum.PENDING };
      const body: OutletFastPaymentStatusDto = {
        merchantId: 'm1',
        outletId: 'o1',
        status: OutletFastPaymentStatusEnum.PENDING,
      } as any;

      outletModel.findOne.mockResolvedValue(outlet);
      outletModel.update.mockResolvedValue([1, [outlet]]);
      fastPaymentServiceProxy.getCircleMerchantMetadata.mockResolvedValue({});
      fastPaymentServiceProxy.upsertFastPaymentStatus.mockResolvedValue({ data: true });

      const result = await service.updateFastPaymentStatus(body, {}, 'user1');

      expect(result).toEqual(outlet);
    });

    it('runs ACTIVE validations and persists when upsert succeeds', async () => {
      const outlet = { outletId: 'o1', fastPaymentStatus: OutletFastPaymentStatusEnum.PENDING };
      const updated = { outletId: 'o1', fastPaymentStatus: OutletFastPaymentStatusEnum.ACTIVE };
      const body: OutletFastPaymentStatusDto = {
        merchantId: 'm1',
        outletId: 'o1',
        status: OutletFastPaymentStatusEnum.ACTIVE,
      } as OutletFastPaymentStatusDto;

      outletModel.findOne.mockResolvedValue(outlet);
      fastPaymentServiceProxy.getCircleMerchantMetadata.mockResolvedValue({ data: { data: { status: 'ACTIVE' } } });
      outletAddressService.find.mockResolvedValue(baseValidAddress());
      outletGetService.getOutletDetails.mockResolvedValue({ name: 'Outlet' });
      fastPaymentServiceProxy.getOutletTabs.mockResolvedValue({ data: { data: [{ id: 't1' }] } });
      posServiceProxy.getPosConfig.mockResolvedValue({ data: { data: { ok: true } } });
      fastPaymentServiceProxy.getOutletPriceConfig.mockResolvedValue({ data: { data: { price: 1 } } });
      fastPaymentServiceProxy.upsertFastPaymentStatus.mockResolvedValue({ data: true });
      outletModel.update.mockResolvedValue([1, [updated]]);

      const result = await service.updateFastPaymentStatus(body, {}, 'user1');

      expect(result).toEqual(updated);
      expect(fastPaymentServiceProxy.getOutletTabs).toHaveBeenCalledWith('o1', {});
      expect(posServiceProxy.getPosConfig).toHaveBeenCalledWith('o1', {});
      expect(fastPaymentServiceProxy.getOutletPriceConfig).toHaveBeenCalledWith('o1', {});
    });

    it('throws when Circle merchant metadata is not ACTIVE during fast payment activation', async () => {
      const outlet = { outletId: 'o1' };
      const body: OutletFastPaymentStatusDto = {
        merchantId: 'm1',
        outletId: 'o1',
        status: OutletFastPaymentStatusEnum.ACTIVE,
      } as OutletFastPaymentStatusDto;

      outletModel.findOne.mockResolvedValue(outlet);
      fastPaymentServiceProxy.getCircleMerchantMetadata.mockResolvedValue({ data: { data: { status: 'PENDING' } } });
      outletAddressService.find.mockResolvedValue(baseValidAddress());
      outletGetService.getOutletDetails.mockResolvedValue({ name: 'Outlet' });

      await expect(service.updateFastPaymentStatus(body, {}, 'user1')).rejects.toThrow('Merchant is not active!');
    });

    it('logs and returns outlet when upsert throws', async () => {
      const outlet = { outletId: 'o1' };
      const body: OutletFastPaymentStatusDto = {
        merchantId: 'm1',
        outletId: 'o1',
        status: OutletFastPaymentStatusEnum.PENDING,
      } as OutletFastPaymentStatusDto;

      outletModel.findOne.mockResolvedValue(outlet);
      fastPaymentServiceProxy.getCircleMerchantMetadata.mockResolvedValue({});
      fastPaymentServiceProxy.upsertFastPaymentStatus.mockRejectedValue(new Error('upsert failed'));

      const result = await service.updateFastPaymentStatus(body, {}, 'user1');

      expect(result).toBe(outlet);
      expect(logger.error).toHaveBeenCalledWith('OutletStatusService.updateFastPaymentStatus method error', {
        e: expect.any(Error),
      });
    });

    it('returns outlet when fastPayment status is not ACTIVE and upsert returns false', async () => {
      const outlet = { outletId: 'o1' };
      const body: OutletFastPaymentStatusDto = {
        merchantId: 'm1',
        outletId: 'o1',
        status: OutletFastPaymentStatusEnum.PENDING,
      } as any;

      outletModel.findOne.mockResolvedValue(outlet);
      fastPaymentServiceProxy.getCircleMerchantMetadata.mockResolvedValue({});
      fastPaymentServiceProxy.upsertFastPaymentStatus.mockResolvedValue({ data: false });

      const result = await service.updateFastPaymentStatus(body, {}, 'user1');

      expect(result).toEqual(outlet);
      expect(outletModel.update).not.toHaveBeenCalled();
    });

    it('throws when minimum tab requirement is not met for ACTIVE', async () => {
      const outlet = { outletId: 'o1' };
      const body: OutletFastPaymentStatusDto = {
        merchantId: 'm1',
        outletId: 'o1',
        status: OutletFastPaymentStatusEnum.ACTIVE,
      } as OutletFastPaymentStatusDto;

      outletModel.findOne.mockResolvedValue(outlet);
      fastPaymentServiceProxy.getCircleMerchantMetadata.mockResolvedValue({ data: { data: { status: 'ACTIVE' } } });
      outletAddressService.find.mockResolvedValue(baseValidAddress());
      outletGetService.getOutletDetails.mockResolvedValue({ name: 'Outlet' });
      fastPaymentServiceProxy.getOutletTabs.mockResolvedValue({ data: { data: [] } });

      await expect(service.updateFastPaymentStatus(body, {}, 'user1')).rejects.toThrow('Minimum one tab is required');
    });

    it('throws when POS configuration is missing for ACTIVE', async () => {
      const outlet = { outletId: 'o1' };
      const body: OutletFastPaymentStatusDto = {
        merchantId: 'm1',
        outletId: 'o1',
        status: OutletFastPaymentStatusEnum.ACTIVE,
      } as OutletFastPaymentStatusDto;

      outletModel.findOne.mockResolvedValue(outlet);
      fastPaymentServiceProxy.getCircleMerchantMetadata.mockResolvedValue({ data: { data: { status: 'ACTIVE' } } });
      outletAddressService.find.mockResolvedValue(baseValidAddress());
      outletGetService.getOutletDetails.mockResolvedValue({ name: 'Outlet' });
      fastPaymentServiceProxy.getOutletTabs.mockResolvedValue({ data: { data: [{ id: 't1' }] } });
      posServiceProxy.getPosConfig.mockResolvedValue({ data: {} });

      await expect(service.updateFastPaymentStatus(body, {}, 'user1')).rejects.toThrow('POS Configuration required');
    });

    it('throws when price configuration is missing for ACTIVE', async () => {
      const outlet = { outletId: 'o1' };
      const body: OutletFastPaymentStatusDto = {
        merchantId: 'm1',
        outletId: 'o1',
        status: OutletFastPaymentStatusEnum.ACTIVE,
      } as OutletFastPaymentStatusDto;

      outletModel.findOne.mockResolvedValue(outlet);
      fastPaymentServiceProxy.getCircleMerchantMetadata.mockResolvedValue({ data: { data: { status: 'ACTIVE' } } });
      outletAddressService.find.mockResolvedValue(baseValidAddress());
      outletGetService.getOutletDetails.mockResolvedValue({ name: 'Outlet' });
      fastPaymentServiceProxy.getOutletTabs.mockResolvedValue({ data: { data: [{ id: 't1' }] } });
      posServiceProxy.getPosConfig.mockResolvedValue({ data: { data: { ok: true } } });
      fastPaymentServiceProxy.getOutletPriceConfig.mockResolvedValue({ data: { data: null } });

      await expect(service.updateFastPaymentStatus(body, {}, 'user1')).rejects.toThrow('Price Configuration required');
    });
  });

  describe('updateOutletsStatus', () => {
    it('deactivates CLO outlets when clo merchant status is false', async () => {
      const dto: MerchantStatusUpdatedDto = {
        merchantId: 'mer-1',
        cloMerchantStatus: false,
      };
      const tx = {} as Transaction;
      const mockOutlet = {
        outletId: 'o1',
        dataValues: { outletId: 'o1', status: OutletStatusEnum.Active },
        outletPhotos: [{ cdnUrl: 'https://hero' }],
      };
      outletModel.findAll.mockResolvedValue([mockOutlet]);
      schemeServiceProxy.getSchemeTransactionDisableOutlet.mockResolvedValue({ data: { data: { disableMerchant: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionDisableOutlet.mockResolvedValue({
        data: { data: { disableMerchant: true } },
      });
      outletModel.update.mockResolvedValue([2]);

      await service.updateOutletsStatus(dto, tx, {}, 'user');

      expect(outletProducer.pushToKafka).toHaveBeenCalled();
      expect(outletModel.update).toHaveBeenCalledWith(
        { status: OutletStatusEnum.Ready, updatedBy: 'user' },
        { where: { merchantId: 'mer-1', status: OutletStatusEnum.Active }, transaction: tx }
      );
    });

    it('deactivates Circle fast payment outlets when circle merchant status is false', async () => {
      const dto: MerchantStatusUpdatedDto = {
        merchantId: 'mer-1',
        circleMerchantStatus: false,
      };
      const tx = {} as Transaction;
      const mockRow = {
        outletId: 'o1',
        name: 'N1',
        dataValues: { outletId: 'o1', name: 'N1' },
        update: jest.fn().mockResolvedValue(undefined),
      };
      outletModel.findAll.mockResolvedValue([mockRow]);
      fastPaymentServiceProxy.upsertFastPaymentStatus.mockResolvedValue({});

      await service.updateOutletsStatus(dto, tx, {}, 'user');

      expect(fastPaymentServiceProxy.upsertFastPaymentStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          outletId: 'o1',
          merchantId: 'mer-1',
          status: OutletFastPaymentStatusEnum.READY,
        }),
        {}
      );
      expect(mockRow.update).toHaveBeenCalledWith(
        expect.objectContaining({ fastPaymentStatus: OutletFastPaymentStatusEnum.READY, updatedBy: 'user' })
      );
    });

    it('throws when CLO outlet is not disabled on Visa', async () => {
      const dto: MerchantStatusUpdatedDto = { merchantId: 'mer-1', cloMerchantStatus: false };
      const tx = {} as Transaction;
      const mockOutlet = {
        outletId: 'o1',
        dataValues: { outletId: 'o1' },
        outletPhotos: [{ cdnUrl: 'https://x' }],
      };
      outletModel.findAll.mockResolvedValue([mockOutlet]);
      schemeServiceProxy.getSchemeTransactionDisableOutlet.mockResolvedValue({ data: { data: { disableMerchant: false } } });
      mastercardSchemeServiceProxy.getSchemeTransactionDisableOutlet.mockResolvedValue({
        data: { data: { disableMerchant: true } },
      });

      await expect(service.updateOutletsStatus(dto, tx, {}, 'user')).rejects.toThrow('Outlet is not disabled on visa!');
    });

    it('throws when CLO outlet is not disabled on Mastercard', async () => {
      const dto: MerchantStatusUpdatedDto = { merchantId: 'mer-1', cloMerchantStatus: false };
      const tx = {} as Transaction;
      const mockOutlet = {
        outletId: 'o1',
        dataValues: { outletId: 'o1' },
        outletPhotos: [],
      };
      outletModel.findAll.mockResolvedValue([mockOutlet]);
      schemeServiceProxy.getSchemeTransactionDisableOutlet.mockResolvedValue({ data: { data: { disableMerchant: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionDisableOutlet.mockResolvedValue({
        data: { data: { disableMerchant: false } },
      });

      await expect(service.updateOutletsStatus(dto, tx, {}, 'user')).rejects.toThrow(
        'Outlet is not disabled on mastercard!'
      );
    });
  });
});
