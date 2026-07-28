import { HttpException } from '@nestjs/common';
import { OutletProfileValidationStatusService } from '../outlet-profile-validation-status.service';
import { OutletProfileStatusEnum } from '../../enums/outlet-profile-enum';
import { UpdateOutletProfileStatusDto } from '../../dtos/update-outlet-profile-status.dto';
import { EnvKeysEnum } from 'config/env.enum';

describe('OutletProfileValidationStatusService', () => {
  const outletProfileModel = {
    update: jest.fn(),
  } as any;
  const outletAddressService = { find: jest.fn() } as any;
  const merchantService = { getMerchantById: jest.fn(), getMerchant: jest.fn() } as any;
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
  const financeServiceProxy = { syncNewOutlet: jest.fn() } as any;
  const dataOperationsProducer = { pushToAuditLogService: jest.fn() } as any;
  const configService = {
    get: jest.fn().mockReturnValue({
      FB_CATEGORY_ID: 'food-drink-id',
      CATEGORY_TYPES: 'sub1,sub2',
      MIMOJO_PROFILE_ID: 'mimojo-profile-id',
    }),
  } as any;
  const searchServiceProxy = { updateOutletStatus: jest.fn() } as any;
  const moEngageProxy = { postOutletActive: jest.fn() } as any;
  const outletGetService = { getOutlet: jest.fn() } as any;
  const sequelize = { transaction: jest.fn() } as any;
  const logger = { info: jest.fn(), error: jest.fn() } as any;

  let service: OutletProfileValidationStatusService;

  const mockDto: UpdateOutletProfileStatusDto = {
    outletId: 'outlet-1',
    profileId: 'profile-1',
    status: OutletProfileStatusEnum.Active,
  };
  const mockToken = { Authorization: 'Bearer token' };
  const mockUserId = 'user-1';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env[EnvKeysEnum.AUDIT_LOG_NODE_STATUS] = 'audit-config-id';
    sequelize.transaction.mockImplementation(async (cb: (t: any) => Promise<any>) => cb({}));
    service = new OutletProfileValidationStatusService(
      outletProfileModel,
      outletAddressService,
      merchantService,
      schemeServiceProxy,
      mastercardSchemeServiceProxy,
      financeServiceProxy,
      dataOperationsProducer,
      configService,
      searchServiceProxy,
      moEngageProxy,
      outletGetService,
      sequelize,
      logger
    );
  });

  describe('validateAndUpdateOutletProfileStatus', () => {
    it('activates outlet profile and pushes to finance', async () => {
      const outletProfileDetails = {
        merchantId: 'merchant-1',
        merchantName: 'Merchant',
        outletName: 'Outlet',
        name: 'Outlet',
        outletNo: 'ON1',
        outletPhotos: [{ isDefault: true }],
        outletFilters: [{ filter: { category: { id: 'cat1' } } }],
        id: 'op-1',
      };
      const outletAddress = {
        areaId: 'area-1',
        neighbourhoodId: 'nb-1',
        latitude: 1,
        longitude: 1,
        location: 'loc',
        neighbourhood: { area: { areaName: 'City' } },
      };
      const merchantData = { status: 'ACTIVE' };
      const updatedOutlet = { id: 'op-1', status: OutletProfileStatusEnum.Active };
      const outletValues = { outletNo: 'ON1' };

      const getOutletProfileDetails = jest.fn().mockResolvedValue(outletProfileDetails);
      const validateProfile = jest.fn();
      const updateOutletProfileCountByMerchant = jest.fn();

      outletAddressService.find.mockResolvedValue(outletAddress);
      merchantService.getMerchantById.mockResolvedValue(merchantData);
      outletGetService.getOutlet.mockResolvedValue(outletValues);
      schemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });
      schemeServiceProxy.getSchemeTransactionEnableOutlet.mockResolvedValue({ data: { data: { disableMerchant: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionEnableOutlet.mockResolvedValue({
        data: { data: { disableMerchant: true } },
      });
      merchantService.getMerchant.mockResolvedValue({
        merchant: { paymentPlan: 'plan' },
        merchantConfiguration: { currencyId: 'USD' },
      });
      financeServiceProxy.syncNewOutlet.mockResolvedValue({});
      outletProfileModel.update.mockResolvedValue([1, [updatedOutlet]]);

      const result = await service.validateAndUpdateOutletProfileStatus(
        mockDto,
        mockToken,
        mockUserId,
        getOutletProfileDetails,
        validateProfile,
        updateOutletProfileCountByMerchant
      );

      expect(result).toEqual(updatedOutlet);
      expect(getOutletProfileDetails).toHaveBeenCalledWith('outlet-1', 'profile-1', mockToken);
      expect(validateProfile).toHaveBeenCalledWith(outletProfileDetails);
      expect(searchServiceProxy.updateOutletStatus).toHaveBeenCalledWith('outlet-1', 'profile-1', 'true');
    });

    it('deactivates from active and validates visa/mastercard disabled', async () => {
      const outletProfileDetails = {
        merchantId: 'merchant-1',
        status: OutletProfileStatusEnum.Active,
      };
      const outletAddress = { areaId: 'a', neighbourhoodId: 'n', latitude: 1, longitude: 1, location: 'l' };
      const merchantData = { status: 'ACTIVE' };
      const updatedOutlet = { id: 'op-1', status: OutletProfileStatusEnum.Pending };

      const getOutletProfileDetails = jest.fn().mockResolvedValue(outletProfileDetails);
      const validateProfile = jest.fn();
      const updateOutletProfileCountByMerchant = jest.fn();

      outletAddressService.find.mockResolvedValue(outletAddress);
      merchantService.getMerchantById.mockResolvedValue(merchantData);
      outletGetService.getOutlet.mockResolvedValue({ outletNo: 'ON1' });
      schemeServiceProxy.getSchemeTransactionDisableOutlet.mockResolvedValue({ data: { data: { disableMerchant: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionDisableOutlet.mockResolvedValue({
        data: { data: { disableMerchant: true } },
      });
      outletProfileModel.update.mockResolvedValue([1, [updatedOutlet]]);

      const result = await service.validateAndUpdateOutletProfileStatus(
        { ...mockDto, status: OutletProfileStatusEnum.Pending },
        mockToken,
        mockUserId,
        getOutletProfileDetails,
        validateProfile,
        updateOutletProfileCountByMerchant
      );

      expect(result).toEqual(updatedOutlet);
      expect(schemeServiceProxy.getSchemeTransactionDisableOutlet).toHaveBeenCalledWith('outlet-1', mockToken);
      expect(mastercardSchemeServiceProxy.getSchemeTransactionDisableOutlet).toHaveBeenCalledWith('outlet-1', mockToken);
    });

    it('throws when outlet profile update returns no result', async () => {
      const outletProfileDetails = { merchantId: 'm1', status: OutletProfileStatusEnum.Active };
      const getOutletProfileDetails = jest.fn().mockResolvedValue(outletProfileDetails);
      const validateProfile = jest.fn();
      const updateOutletProfileCountByMerchant = jest.fn();

      outletAddressService.find.mockResolvedValue({
        areaId: 'a',
        neighbourhoodId: 'n',
        latitude: 1,
        longitude: 1,
        location: 'l',
      });
      merchantService.getMerchantById.mockResolvedValue({ status: 'ACTIVE' });
      outletGetService.getOutlet.mockResolvedValue({});
      schemeServiceProxy.getSchemeTransactionDisableOutlet.mockResolvedValue({ data: { data: { disableMerchant: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionDisableOutlet.mockResolvedValue({
        data: { data: { disableMerchant: true } },
      });
      outletProfileModel.update.mockResolvedValue([1, []]);

      await expect(
        service.validateAndUpdateOutletProfileStatus(
          { ...mockDto, status: OutletProfileStatusEnum.Pending },
          mockToken,
          mockUserId,
          getOutletProfileDetails,
          validateProfile,
          updateOutletProfileCountByMerchant
        )
      ).rejects.toThrow(HttpException);
    });

    it('throws HttpException on validation error', async () => {
      const outletProfileDetails = {
        merchantId: 'm1',
        outletPhotos: [],
        outletFilters: [],
      };
      const getOutletProfileDetails = jest.fn().mockResolvedValue(outletProfileDetails);
      const validateProfile = jest.fn();
      const updateOutletProfileCountByMerchant = jest.fn();

      outletAddressService.find.mockResolvedValue({
        areaId: 'a',
        neighbourhoodId: 'n',
        latitude: 1,
        longitude: 1,
        location: 'l',
      });
      merchantService.getMerchantById.mockResolvedValue({ status: 'ACTIVE' });
      outletGetService.getOutlet.mockResolvedValue({});

      await expect(
        service.validateAndUpdateOutletProfileStatus(
          mockDto,
          mockToken,
          mockUserId,
          getOutletProfileDetails,
          validateProfile,
          updateOutletProfileCountByMerchant
        )
      ).rejects.toThrow(HttpException);
    });

    it('runs moengage and audit when profile is mimojo', async () => {
      const dto = { ...mockDto, profileId: 'mimojo-profile-id', status: OutletProfileStatusEnum.Active };
      const outletProfileDetails = {
        merchantId: 'merchant-1',
        merchantName: 'Merchant',
        outletName: 'Outlet',
        name: 'Outlet',
        outletNo: 'ON1',
        outletPhotos: [{ isDefault: true }],
        outletFilters: [{ filter: { category: { id: 'cat1' } } }],
        id: 'op-1',
      };
      const getOutletProfileDetails = jest.fn().mockResolvedValue(outletProfileDetails);
      const validateProfile = jest.fn();
      const updateOutletProfileCountByMerchant = jest.fn();

      outletAddressService.find.mockResolvedValue({
        areaId: 'a',
        neighbourhoodId: 'n',
        latitude: 1,
        longitude: 1,
        location: 'loc',
        neighbourhood: { area: { areaName: 'City' } },
      });
      merchantService.getMerchantById.mockResolvedValue({ status: 'ACTIVE' });
      outletGetService.getOutlet.mockResolvedValue({ outletNo: 'ON1' });
      schemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });
      schemeServiceProxy.getSchemeTransactionEnableOutlet.mockResolvedValue({ data: { data: { disableMerchant: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionEnableOutlet.mockResolvedValue({
        data: { data: { disableMerchant: true } },
      });
      merchantService.getMerchant.mockResolvedValue({
        merchant: { paymentPlan: 'plan' },
        merchantConfiguration: { currencyId: 'USD' },
      });
      outletProfileModel.update.mockResolvedValue([1, [{ id: 'op-1', status: OutletProfileStatusEnum.Active }]]);

      await service.validateAndUpdateOutletProfileStatus(
        dto,
        mockToken,
        mockUserId,
        getOutletProfileDetails,
        validateProfile,
        updateOutletProfileCountByMerchant
      );

      expect(moEngageProxy.postOutletActive).toHaveBeenCalled();
      expect(dataOperationsProducer.pushToAuditLogService).toHaveBeenCalled();
    });

    it('throws when merchant is not active', async () => {
      const getOutletProfileDetails = jest.fn().mockResolvedValue({
        merchantId: 'm1',
        name: 'Outlet',
        outletPhotos: [{ isDefault: true }],
        outletFilters: [{}],
      });
      outletAddressService.find.mockResolvedValue({
        areaId: 'a',
        neighbourhoodId: 'n',
        latitude: 1,
        longitude: 1,
        location: 'loc',
      });
      merchantService.getMerchantById.mockResolvedValue({ status: 'INACTIVE' });
      outletGetService.getOutlet.mockResolvedValue({});

      await expect(
        service.validateAndUpdateOutletProfileStatus(
          mockDto,
          mockToken,
          mockUserId,
          getOutletProfileDetails,
          jest.fn(),
          jest.fn()
        )
      ).rejects.toThrow('Merchant is not active!');
    });

    it('throws when scheme activation checks fail', async () => {
      const getOutletProfileDetails = jest.fn().mockResolvedValue({
        merchantId: 'm1',
        name: 'Outlet',
        outletPhotos: [{ isDefault: true }],
        outletFilters: [{}],
      });
      outletAddressService.find.mockResolvedValue({
        areaId: 'a',
        neighbourhoodId: 'n',
        latitude: 1,
        longitude: 1,
        location: 'loc',
      });
      merchantService.getMerchantById.mockResolvedValue({ status: 'ACTIVE' });
      outletGetService.getOutlet.mockResolvedValue({});
      schemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: false } } });

      await expect(
        service.validateAndUpdateOutletProfileStatus(
          mockDto,
          mockToken,
          mockUserId,
          getOutletProfileDetails,
          jest.fn(),
          jest.fn()
        )
      ).rejects.toThrow('Outlet is not active on visa!');
    });

    it('throws when outlet profile hero image is missing', async () => {
      const getOutletProfileDetails = jest.fn().mockResolvedValue({
        merchantId: 'm1',
        name: 'Outlet',
        outletPhotos: [{ isDefault: false }],
        outletFilters: [{}],
      });
      outletAddressService.find.mockResolvedValue({
        areaId: 'a',
        neighbourhoodId: 'n',
        latitude: 1,
        longitude: 1,
        location: 'loc',
      });
      merchantService.getMerchantById.mockResolvedValue({ status: 'ACTIVE' });
      outletGetService.getOutlet.mockResolvedValue({});

      await expect(
        service.validateAndUpdateOutletProfileStatus(
          mockDto,
          mockToken,
          mockUserId,
          getOutletProfileDetails,
          jest.fn(),
          jest.fn()
        )
      ).rejects.toThrow('Please upload hero image!');
    });

    it('throws when outlet profile category is missing', async () => {
      const getOutletProfileDetails = jest.fn().mockResolvedValue({
        merchantId: 'm1',
        name: 'Outlet',
        outletPhotos: [{ isDefault: true }],
        outletFilters: null,
      });
      outletAddressService.find.mockResolvedValue({
        areaId: 'a',
        neighbourhoodId: 'n',
        latitude: 1,
        longitude: 1,
        location: 'loc',
      });
      merchantService.getMerchantById.mockResolvedValue({ status: 'ACTIVE' });
      outletGetService.getOutlet.mockResolvedValue({});

      await expect(
        service.validateAndUpdateOutletProfileStatus(
          mockDto,
          mockToken,
          mockUserId,
          getOutletProfileDetails,
          jest.fn(),
          jest.fn()
        )
      ).rejects.toThrow('Please select outlet category!');
    });

    it('throws when mastercard live check fails', async () => {
      const getOutletProfileDetails = jest.fn().mockResolvedValue({
        merchantId: 'm1',
        name: 'Outlet',
        outletPhotos: [{ isDefault: true }],
        outletFilters: [{}],
      });
      outletAddressService.find.mockResolvedValue({
        areaId: 'a',
        neighbourhoodId: 'n',
        latitude: 1,
        longitude: 1,
        location: 'loc',
      });
      merchantService.getMerchantById.mockResolvedValue({ status: 'ACTIVE' });
      outletGetService.getOutlet.mockResolvedValue({});
      schemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({
        data: { data: { isLive: false } },
      });

      await expect(
        service.validateAndUpdateOutletProfileStatus(
          mockDto,
          mockToken,
          mockUserId,
          getOutletProfileDetails,
          jest.fn(),
          jest.fn()
        )
      ).rejects.toThrow('Outlet is not active on mastercard!');
    });

    it('throws when mastercard enable check fails', async () => {
      const getOutletProfileDetails = jest.fn().mockResolvedValue({
        merchantId: 'm1',
        name: 'Outlet',
        outletPhotos: [{ isDefault: true }],
        outletFilters: [{}],
      });
      outletAddressService.find.mockResolvedValue({
        areaId: 'a',
        neighbourhoodId: 'n',
        latitude: 1,
        longitude: 1,
        location: 'loc',
      });
      merchantService.getMerchantById.mockResolvedValue({ status: 'ACTIVE' });
      outletGetService.getOutlet.mockResolvedValue({});
      schemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });
      schemeServiceProxy.getSchemeTransactionEnableOutlet.mockResolvedValue({ data: { data: { disableMerchant: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionEnableOutlet.mockResolvedValue({
        data: { data: { disableMerchant: false } },
      });

      await expect(
        service.validateAndUpdateOutletProfileStatus(
          mockDto,
          mockToken,
          mockUserId,
          getOutletProfileDetails,
          jest.fn(),
          jest.fn()
        )
      ).rejects.toThrow('Outlet is not enabled on mastercard!');
    });

    it('throws when visa enable check fails', async () => {
      const getOutletProfileDetails = jest.fn().mockResolvedValue({
        merchantId: 'm1',
        name: 'Outlet',
        outletPhotos: [{ isDefault: true }],
        outletFilters: [{}],
      });
      outletAddressService.find.mockResolvedValue({
        areaId: 'a',
        neighbourhoodId: 'n',
        latitude: 1,
        longitude: 1,
        location: 'loc',
      });
      merchantService.getMerchantById.mockResolvedValue({ status: 'ACTIVE' });
      outletGetService.getOutlet.mockResolvedValue({});
      schemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });
      schemeServiceProxy.getSchemeTransactionEnableOutlet.mockResolvedValue({ data: { data: { disableMerchant: false } } });

      await expect(
        service.validateAndUpdateOutletProfileStatus(
          mockDto,
          mockToken,
          mockUserId,
          getOutletProfileDetails,
          jest.fn(),
          jest.fn()
        )
      ).rejects.toThrow('Outlet is not enabled on visa!');
    });

    it('throws when deactivation disable checks fail', async () => {
      const getOutletProfileDetails = jest.fn().mockResolvedValue({
        merchantId: 'm1',
        status: OutletProfileStatusEnum.Active,
      });
      outletAddressService.find.mockResolvedValue({
        areaId: 'a',
        neighbourhoodId: 'n',
        latitude: 1,
        longitude: 1,
        location: 'loc',
      });
      merchantService.getMerchantById.mockResolvedValue({ status: 'ACTIVE' });
      outletGetService.getOutlet.mockResolvedValue({});
      schemeServiceProxy.getSchemeTransactionDisableOutlet.mockResolvedValue({ data: { data: { disableMerchant: false } } });

      await expect(
        service.validateAndUpdateOutletProfileStatus(
          { ...mockDto, status: OutletProfileStatusEnum.Pending },
          mockToken,
          mockUserId,
          getOutletProfileDetails,
          jest.fn(),
          jest.fn()
        )
      ).rejects.toThrow('Outlet is not disabled on visa!');
    });

    it('throws when deactivation mastercard disable check fails', async () => {
      const getOutletProfileDetails = jest.fn().mockResolvedValue({
        merchantId: 'm1',
        status: OutletProfileStatusEnum.Active,
      });
      outletAddressService.find.mockResolvedValue({
        areaId: 'a',
        neighbourhoodId: 'n',
        latitude: 1,
        longitude: 1,
        location: 'loc',
      });
      merchantService.getMerchantById.mockResolvedValue({ status: 'ACTIVE' });
      outletGetService.getOutlet.mockResolvedValue({});
      schemeServiceProxy.getSchemeTransactionDisableOutlet.mockResolvedValue({ data: { data: { disableMerchant: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionDisableOutlet.mockResolvedValue({
        data: { data: { disableMerchant: false } },
      });

      await expect(
        service.validateAndUpdateOutletProfileStatus(
          { ...mockDto, status: OutletProfileStatusEnum.Pending },
          mockToken,
          mockUserId,
          getOutletProfileDetails,
          jest.fn(),
          jest.fn()
        )
      ).rejects.toThrow('Outlet is not disabled on mastercard!');
    });

    it('resolves finance category to included fb subcategory', async () => {
      const dto = { ...mockDto, profileId: 'not-mimojo', status: OutletProfileStatusEnum.Active };
      const getOutletProfileDetails = jest.fn().mockResolvedValue({
        merchantId: 'm1',
        name: 'Outlet',
        outletNo: 'ON1',
        id: 'op-1',
        outletPhotos: [{ isDefault: true }],
        outletFilters: [
          { filter: { category: { id: 'food-drink-id' }, subCategory: { id: 'sub2' } } },
          { filter: { category: { id: 'food-drink-id' }, subCategory: { id: 'x' } } },
        ],
      });
      outletAddressService.find.mockResolvedValue({
        areaId: 'a',
        neighbourhoodId: 'n',
        latitude: 1,
        longitude: 1,
        location: 'loc',
        neighbourhood: { area: { areaName: 'City' } },
      });
      merchantService.getMerchantById.mockResolvedValue({ status: 'ACTIVE' });
      outletGetService.getOutlet.mockResolvedValue({});
      schemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionServiceStatus.mockResolvedValue({ data: { data: { isLive: true } } });
      schemeServiceProxy.getSchemeTransactionEnableOutlet.mockResolvedValue({ data: { data: { disableMerchant: true } } });
      mastercardSchemeServiceProxy.getSchemeTransactionEnableOutlet.mockResolvedValue({
        data: { data: { disableMerchant: true } },
      });
      merchantService.getMerchant.mockResolvedValue({
        merchant: { paymentPlan: 'plan' },
        merchantConfiguration: { currencyId: 'USD' },
      });
      outletProfileModel.update.mockResolvedValue([1, [{ id: 'op-1', status: OutletProfileStatusEnum.Active }]]);

      await service.validateAndUpdateOutletProfileStatus(
        dto,
        mockToken,
        mockUserId,
        getOutletProfileDetails,
        jest.fn(),
        jest.fn()
      );

      expect(financeServiceProxy.syncNewOutlet).toHaveBeenCalledWith(
        'op-1',
        'Outlet',
        ['sub2'],
        'City',
        'ON1',
        'plan',
        mockToken,
        'USD'
      );
    });
  });

  describe('pushNodeStatusToAuditLog', () => {
    it('pushes audit log with mapped status', () => {
      const response = { id: 'op-1', status: OutletProfileStatusEnum.Active };
      service.pushNodeStatusToAuditLog(mockDto, response as any);
      expect(dataOperationsProducer.pushToAuditLogService).toHaveBeenCalledWith(
        'mimojo-places-service',
        { status: 'ACTIVE', values: response },
        { audit_main_node_configuration_id: 'audit-config-id' }
      );
    });

    it('maps Pending to PENDING', () => {
      const response = { id: 'op-1' };
      service.pushNodeStatusToAuditLog({ ...mockDto, status: OutletProfileStatusEnum.Pending }, response as any);
      expect(dataOperationsProducer.pushToAuditLogService).toHaveBeenCalledWith(
        'mimojo-places-service',
        { status: 'PENDING', values: response },
        expect.any(Object)
      );
    });

    it('maps Ready to INACTIVE', () => {
      const response = { id: 'op-1' };
      service.pushNodeStatusToAuditLog({ ...mockDto, status: OutletProfileStatusEnum.Ready }, response as any);
      expect(dataOperationsProducer.pushToAuditLogService).toHaveBeenCalledWith(
        'mimojo-places-service',
        { status: 'INACTIVE', values: response },
        expect.any(Object)
      );
    });
  });
});
