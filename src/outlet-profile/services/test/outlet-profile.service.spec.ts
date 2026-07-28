import { HttpException } from '@nestjs/common';
import { Op } from 'sequelize';
import { EnvKeysEnum } from 'config/env.enum';
import { OutletProfileService } from '../outlet-profile.service';
import { OutletProfileStatusEnum } from 'src/outlet-profile/enums/outlet-profile-enum';

jest.mock('src/outlet-profile/entities/outlet-profile.model', () => ({
  OutletProfileMetadata: {
    findOne: jest.fn(),
  },
}));

jest.mock('src/outlet/models/outlet.model', () => ({
  Outlet: {
    findOne: jest.fn(),
  },
}));

jest.mock('src/outlet/models/outlet-address.model', () => ({
  OutletAddress: {
    findOne: jest.fn(),
  },
}));

jest.mock('src/outlet/models/outlet-timing.model', () => ({
  OutletTiming: {
    findOne: jest.fn(),
  },
}));

import { OutletProfileMetadata } from 'src/outlet-profile/entities/outlet-profile.model';
import { Outlet } from 'src/outlet/models/outlet.model';
import { OutletAddress } from 'src/outlet/models/outlet-address.model';
import { OutletTiming } from 'src/outlet/models/outlet-timing.model';

describe('OutletProfileService', () => {
  const outletProfileModel = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    findOrCreate: jest.fn(),
    count: jest.fn(),
  } as any;
  const logger = { info: jest.fn(), error: jest.fn() } as any;
  const outletOfferProxy = {
    getOutletAllOffers: jest.fn(),
    getOutletScheduledOffer: jest.fn(),
    getAllOutletOffersByMerchantIdAndProfileId: jest.fn(),
  } as any;
  const merchantProfileService = {
    getMerchantProfileMetaData: jest.fn(),
    updateMerchantProfileOutletsNumber: jest.fn(),
  } as any;
  const outletProfileFilterService = {
    formatOutletProfileFilter: jest.fn(),
    addOutletProfileFilters: jest.fn(),
    handleOutletProfileNotCustomizedFiltersChange: jest.fn(),
    cloneOutletProfileFilters: jest.fn(),
  } as any;
  const sequelize = { transaction: jest.fn() } as any;
  const outletGetService = { getOutletDetails: jest.fn(), getOutlets: jest.fn(), getOutletsRewardEngine: jest.fn() } as any;
  const fastPaymentServiceProxy = {
    getOutletTabs: jest.fn(),
    getOutletPriceConfig: jest.fn(),
    getOutletConfig: jest.fn(),
    getOutlet: jest.fn(),
  } as any;
  const posServiceProxy = { getPosConfig: jest.fn() } as any;
  const outletAddressService = { updateByOutletId: jest.fn(), getOutletLocation: jest.fn() } as any;
  const merchantService = { getMerchantById: jest.fn() } as any;
  const configService = {
    get: jest.fn().mockReturnValue({
      FB_CATEGORY_ID: 'fb',
      CATEGORY_TYPES: 'A,B',
      MIMOJO_PROFILE_ID: 'mimojo-profile',
    }),
  } as any;
  const outletModel = { update: jest.fn(), findAndCountAll: jest.fn() } as any;
  const outletProfileMappingService = {
    findAllOutletsByTransactionDate: jest.fn(),
    insertToOutletProfileMetadata: jest.fn(),
    getMappedOutletDetails: jest.fn(),
  } as any;
  const outletPhotoService = { insertDefaultOutletImages: jest.fn(), find: jest.fn() } as any;
  const outletProfilePhotosService = {
    cloneProfileOutletImages: jest.fn(),
    deleteOutletProfilePhotosByOutletProfileId: jest.fn(),
    insertDefaultOutletImages: jest.fn(),
  } as any;
  const rewardEngineWrapperProxy = {
    getOutletPriceConfig: jest.fn(),
    getPosConfig: jest.fn(),
    getOutletConfig: jest.fn(),
    getOutletAllRewards: jest.fn(),
  } as any;
  const outletProfileValidationStatusService = {
    validateAndUpdateOutletProfileStatus: jest.fn(),
    validateAndUpdateOutletProfileStatusRewardEngine: jest.fn(),
  } as any;

  let service: OutletProfileService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OutletProfileService(
      outletProfileModel,
      logger,
      outletOfferProxy,
      merchantProfileService,
      outletProfileFilterService,
      sequelize,
      outletGetService,
      fastPaymentServiceProxy,
      posServiceProxy,
      outletAddressService,
      merchantService,
      configService,
      outletModel,
      outletProfileMappingService,
      outletPhotoService,
      outletProfilePhotosService,
      rewardEngineWrapperProxy,
      outletProfileValidationStatusService
    );
  });

  it('updates status for profile', async () => {
    outletProfileModel.update.mockResolvedValue([1]);

    await service.updateStatusForProfile('o1', 'p1', OutletProfileStatusEnum.Active);

    expect(outletProfileModel.update).toHaveBeenCalledWith(
      { status: OutletProfileStatusEnum.Active },
      {
        where: { outletId: 'o1', profileId: 'p1' },
        returning: true,
      }
    );
  });

  it('finds outlets by ids and profile', async () => {
    outletProfileModel.findAll.mockResolvedValue([{ id: '1' }]);

    const result = await service.findOutletsByIdandProfile(['1', '2'], 'p1');

    expect(outletProfileModel.findAll).toHaveBeenCalledWith({
      where: {
        id: { [Op.in]: ['1', '2'] },
        profileId: 'p1',
        status: OutletProfileStatusEnum.Active,
      },
    });
    expect(result).toEqual([{ id: '1' }]);
  });

  it('finds outlet profiles for filters', async () => {
    outletProfileModel.findAll.mockResolvedValue([{ outletId: 'o1' }]);

    const result = await service.findOutletProfilesForFilters(['f1', 'f2'], 'p1');

    expect(outletProfileModel.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { profileId: 'p1', status: OutletProfileStatusEnum.Active },
        attributes: ['outletId'],
      })
    );
    expect(result).toEqual([{ outletId: 'o1' }]);
  });

  it('updates offer details by outlet and profile', async () => {
    await service.updateOfferDetails('o1', 10, true, 'p1');

    expect(outletProfileModel.update).toHaveBeenCalledWith(
      { maxOffer: 10, hasCustomOffer: true },
      { where: { outletId: 'o1', profileId: 'p1' } }
    );
  });

  it('updates outlet offer for multiple outlet ids', async () => {
    await service.updateOutletOffer({ maxOffer: 12 }, ['o1', 'o2'], 'p1');

    expect(outletProfileModel.update).toHaveBeenCalledWith(
      { maxOffer: 12 },
      { where: { outletId: { [Op.in]: ['o1', 'o2'] }, profileId: 'p1' } }
    );
  });

  it('returns true when profile status is active', async () => {
    outletProfileModel.findOne.mockResolvedValue({ status: OutletProfileStatusEnum.Active });

    const result = await service.getOutletStatusByProfileId('o1', 'p1');

    expect(result).toBe(true);
  });

  it('throws HttpException when outlet profile is missing', async () => {
    outletProfileModel.findOne.mockResolvedValue(null);

    await expect(service.getOutletStatusByProfileId('o1', 'p1')).rejects.toBeInstanceOf(HttpException);
  });

  it('delegates validation status update to validation service', async () => {
    outletProfileValidationStatusService.validateAndUpdateOutletProfileStatus.mockResolvedValue({ status: 'ok' });

    const result = await service.validateAndUpdateOutletProfileStatus({ outletId: 'o1' } as any, {} as any, 'u1');

    expect(outletProfileValidationStatusService.validateAndUpdateOutletProfileStatus).toHaveBeenCalled();
    expect(result).toEqual({ status: 'ok' });
  });

  describe('getOutletProfileMetadata', () => {
    it('returns outlet profile metadata with offers', async () => {
      const outletProfile = {
        get: jest
          .fn()
          .mockReturnValue({ id: '1', outlet: { rating: 4 }, outletProfilePhotos: [], outletProfileFilters: [] }),
      };
      outletProfileModel.findOne.mockResolvedValue(outletProfile);
      outletOfferProxy.getOutletAllOffers.mockResolvedValue({ data: { data: { offer: 'x' } } });
      fastPaymentServiceProxy.getOutletTabs.mockResolvedValue({});
      fastPaymentServiceProxy.getOutletPriceConfig.mockResolvedValue({});
      fastPaymentServiceProxy.getOutlet.mockResolvedValue({});
      fastPaymentServiceProxy.getOutletConfig.mockResolvedValue({});
      posServiceProxy.getPosConfig.mockResolvedValue({});

      const result = await service.getOutletProfileMetadata('o1', 'p1', {});

      expect(outletProfileModel.findOne).toHaveBeenCalled();
      expect(outletOfferProxy.getOutletAllOffers).toHaveBeenCalledWith('o1', {}, 'p1');
      expect(result).toBeDefined();
    });

    it('returns metadata when getAdditionalOutletData fails', async () => {
      const outletProfile = {
        get: jest
          .fn()
          .mockReturnValue({ id: '1', outlet: { rating: 4 }, outletProfilePhotos: [], outletProfileFilters: [] }),
      };
      outletProfileModel.findOne.mockResolvedValue(outletProfile);
      outletOfferProxy.getOutletAllOffers.mockResolvedValue({ data: { data: {} } });
      fastPaymentServiceProxy.getOutletTabs.mockRejectedValue(new Error('fp fail'));

      const result = await service.getOutletProfileMetadata('o1', 'p1', {});

      expect(result).toBeDefined();
      expect(logger.error).toHaveBeenCalled();
    });

    it('returns null when outlet profile not found', async () => {
      outletProfileModel.findOne.mockResolvedValue(null);

      const result = await service.getOutletProfileMetadata('o1', 'p1', {});

      expect(result).toBeNull();
    });

    it('throws on error', async () => {
      outletProfileModel.findOne.mockRejectedValue(new Error('db error'));

      await expect(service.getOutletProfileMetadata('o1', 'p1', {})).rejects.toThrow(HttpException);
    });
  });

  describe('getOutletProfileMetadataRewardEngine', () => {
    it('returns metadata with reward engine offers', async () => {
      const outletProfile = {
        get: jest
          .fn()
          .mockReturnValue({ id: '1', outlet: { rating: 4 }, outletProfilePhotos: [], outletProfileFilters: [] }),
      };
      outletProfileModel.findOne.mockResolvedValue(outletProfile);
      rewardEngineWrapperProxy.getOutletAllRewards.mockResolvedValue({ data: { data: { rules: [] } } });
      fastPaymentServiceProxy.getOutletTabs.mockResolvedValue({});
      fastPaymentServiceProxy.getOutletPriceConfig.mockResolvedValue({});
      fastPaymentServiceProxy.getOutlet.mockResolvedValue({});
      fastPaymentServiceProxy.getOutletConfig.mockResolvedValue({});
      posServiceProxy.getPosConfig.mockResolvedValue({});

      const result = await service.getOutletProfileMetadataRewardEngine('o1', 'p1', {});

      expect(rewardEngineWrapperProxy.getOutletAllRewards).toHaveBeenCalledWith('o1', {}, 'p1');
      expect(result).toBeDefined();
    });
  });

  describe('getOutletDetailsMetadata', () => {
    it('returns outlet details metadata', async () => {
      const outletProfile = {
        toJSON: jest.fn().mockReturnValue({ id: '1' }),
        outletProfilePhotos: [],
        outletProfileFilters: [],
      };
      (OutletProfileMetadata.findOne as jest.Mock).mockResolvedValue(outletProfile);
      (Outlet.findOne as jest.Mock).mockResolvedValue({ toJSON: () => ({ rating: 4 }) });
      (OutletAddress.findOne as jest.Mock).mockResolvedValue({ formattedAddress: 'addr' });
      (OutletTiming.findOne as jest.Mock).mockResolvedValue({ weekdayText: [{ day: 'Mon', time: '9-5' }] });

      const result = await service.getOutletDetailsMetadata('o1', 'p1');

      expect(result).toMatchObject({
        outletDetails: expect.any(Object),
        outletProfilePhotos: [],
        outletProfileFilters: [],
      });
    });

    it('throws when outlet profile not found', async () => {
      (OutletProfileMetadata.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.getOutletDetailsMetadata('o1', 'p1')).rejects.toThrow(HttpException);
    });

    it('adds active status filter for ADIB profile', async () => {
      process.env[EnvKeysEnum.ADIB_PROFILE_ID] = 'adib-profile';
      (OutletProfileMetadata.findOne as jest.Mock).mockResolvedValue({
        toJSON: jest.fn().mockReturnValue({ id: '1' }),
        outletProfilePhotos: [],
        outletProfileFilters: [],
      });
      (Outlet.findOne as jest.Mock).mockResolvedValue({ toJSON: () => ({}) });
      (OutletAddress.findOne as jest.Mock).mockResolvedValue({});
      (OutletTiming.findOne as jest.Mock).mockResolvedValue({ weekdayText: [] });

      await service.getOutletDetailsMetadata('o1', 'adib-profile');

      expect(OutletProfileMetadata.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ outletId: 'o1', profileId: 'adib-profile', status: 'Active' }),
        })
      );
    });
  });

  describe('updateMerchantProfileDataToOutletProfile', () => {
    it('updates merchant profile data and returns affected count', async () => {
      outletProfileModel.update.mockResolvedValue([2]);
      outletProfileModel.findAll.mockResolvedValue([{ id: 'op1' }, { id: 'op2' }]);

      const result = await service.updateMerchantProfileDataToOutletProfile(
        { merchantId: 'm1', profileId: 'p1', merchantName: 'M', desc: 'd', updatedBy: 'u1' } as any,
        [],
        {} as any
      );

      expect(outletProfileModel.update).toHaveBeenCalled();
      expect(outletProfileFilterService.handleOutletProfileNotCustomizedFiltersChange).toHaveBeenCalled();
      expect(result).toBe(2);
    });

    it('logs when no outlet profile found', async () => {
      outletProfileModel.update.mockResolvedValue([0]);
      outletProfileModel.findAll.mockResolvedValue([]);

      await service.updateMerchantProfileDataToOutletProfile(
        { merchantId: 'm1', profileId: 'p1', merchantName: 'M', desc: 'd', updatedBy: 'u1' } as any,
        [],
        {} as any
      );

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('There is no outlet profile found'));
    });
  });

  describe('getProfileOutlets', () => {
    it('returns paginated profile outlets with isMap true', async () => {
      outletProfileMappingService.getMappedOutletDetails.mockResolvedValue([{ outletId: 'o1' }]);
      outletModel.findAndCountAll.mockResolvedValue({
        rows: [
          {
            dataValues: { id: 'o1' },
            outletAddress: { location: 'loc', neighbourhood: { area: { areaName: 'City' } } },
            profileOutlets: [{ name: 'P', status: 'Active', maxOffer: 10 }],
            outletNo: '1',
          },
        ],
        count: 1,
      });
      outletOfferProxy.getAllOutletOffersByMerchantIdAndProfileId.mockResolvedValue({ data: { data: {} } });

      const dto = { pageIndex: 0, pageSize: 10, isMap: true } as any;
      const result = await service.getProfileOutlets('m1', 'p1', dto, {});

      expect(result).toMatchObject({
        data: expect.any(Array),
        pagination: expect.objectContaining({ page: 0, total: 1 }),
      });
    });

    it('returns empty when count is 0', async () => {
      outletProfileMappingService.getMappedOutletDetails.mockResolvedValue([]);
      outletModel.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      const dto = { pageIndex: 0, pageSize: 10, isMap: false } as any;
      const result = await service.getProfileOutlets('m1', 'p1', dto, {});

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('continues when getAllOutletOffersByMerchantId fails', async () => {
      outletProfileMappingService.getMappedOutletDetails.mockResolvedValue([{ outletId: 'o1' }]);
      outletModel.findAndCountAll.mockResolvedValue({
        rows: [
          {
            dataValues: { id: 'o1' },
            outletAddress: { location: 'loc', neighbourhood: { area: { areaName: 'City' } } },
            profileOutlets: [{ name: 'P', status: 'Active', maxOffer: 10 }],
            outletNo: '1',
          },
        ],
        count: 1,
      });
      outletOfferProxy.getAllOutletOffersByMerchantIdAndProfileId.mockRejectedValue(new Error('offers fail'));

      const dto = { pageIndex: 0, pageSize: 10, isMap: true } as any;
      const result = await service.getProfileOutlets('m1', 'p1', dto, {});

      expect(result.data).toHaveLength(1);
      expect(logger.error).toHaveBeenCalled();
    });

    it('throws on getProfileOutlets error', async () => {
      outletProfileMappingService.getMappedOutletDetails.mockRejectedValue(new Error('mapping fail'));

      const dto = { pageIndex: 0, pageSize: 10 } as any;
      await expect(service.getProfileOutlets('m1', 'p1', dto, {})).rejects.toThrow(HttpException);
    });
  });

  describe('createOrUpdateOutletProfileMetadata', () => {
    it('creates new outlet profile metadata', async () => {
      merchantProfileService.getMerchantProfileMetaData.mockResolvedValue({
        name: 'Merchant',
        nameAr: 'MerchantAr',
        imageUrl: 'url',
        desc: 'desc',
        descAr: 'descAr',
        filters: [],
      });
      const createdProfile = { id: 'op1' };
      outletProfileModel.create.mockResolvedValue(createdProfile);
      const mockTransaction = { commit: jest.fn().mockResolvedValue(undefined) };
      sequelize.transaction.mockResolvedValue(mockTransaction);

      const dto = {
        merchantId: 'm1',
        profileId: 'p1',
        outletId: 'o1',
        name: 'Outlet',
      } as any;

      const result = await service.createOrUpdateOutletProfileMetadata(dto, 'u1');

      expect(outletProfileModel.create).toHaveBeenCalled();
      expect(outletProfileFilterService.addOutletProfileFilters).toHaveBeenCalled();
      expect(result).toEqual(createdProfile);
    });

    it('updates existing outlet profile metadata', async () => {
      merchantProfileService.getMerchantProfileMetaData.mockResolvedValue({
        name: 'Merchant',
        nameAr: 'MerchantAr',
        imageUrl: 'url',
        desc: 'desc',
        filters: [],
      });
      const updatedRow = { id: 'op1' };
      outletProfileModel.update.mockResolvedValue([1, [updatedRow]]);
      const mockTransaction = { commit: jest.fn().mockResolvedValue(undefined) };
      sequelize.transaction.mockResolvedValue(mockTransaction);

      const dto = {
        id: 'op1',
        merchantId: 'm1',
        profileId: 'p1',
        outletId: 'o1',
        name: 'Outlet',
      } as any;

      const result = await service.createOrUpdateOutletProfileMetadata(dto, 'u1');

      expect(outletProfileModel.update).toHaveBeenCalled();
      expect(result).toEqual(updatedRow);
    });
  });

  describe('getMerchantProfileOutlets', () => {
    it('returns empty when no mapped outlets', async () => {
      outletProfileMappingService.getMappedOutletDetails.mockResolvedValue([]);

      const result = await service.getMerchantProfileOutlets('m1', 'p1', {});

      expect(result).toEqual([]);
    });

    it('returns merchant profile outlets', async () => {
      outletProfileMappingService.getMappedOutletDetails.mockResolvedValue([{ outletId: 'o1' }]);
      outletProfileModel.findAll.mockResolvedValue([
        {
          get: jest.fn().mockReturnValue({
            id: 'op1',
            name: 'Outlet',
            outlet: { id: 'o1', rating: 4, outletAddress: { location: 'loc' }, outletProfilePhotos: [] },
            merchantName: 'M',
            maxOffer: 10,
            status: 'Active',
          }),
          outlet: { id: 'o1' },
        },
      ]);
      outletOfferProxy.getAllOutletOffersByMerchantIdAndProfileId.mockResolvedValue({ data: { data: {} } });

      const result = await service.getMerchantProfileOutlets('m1', 'p1', {});

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'op1', name: 'Outlet', merchantName: 'M' });
    });

    it('logs and continues when offer service fails in merchant profile outlets', async () => {
      outletProfileMappingService.getMappedOutletDetails.mockResolvedValue([{ outletId: 'o1' }]);
      outletProfileModel.findAll.mockResolvedValue([
        {
          get: jest.fn().mockReturnValue({
            id: 'op1',
            name: 'Outlet',
            outlet: { id: 'o1', rating: 4, outletAddress: { location: 'loc' }, outletProfilePhotos: [] },
            merchantName: 'M',
            maxOffer: 10,
            status: 'Active',
          }),
          outlet: { dataValues: { id: 'o1' } },
        },
      ]);
      outletOfferProxy.getAllOutletOffersByMerchantIdAndProfileId.mockRejectedValue(new Error('offers fail'));

      const result = await service.getMerchantProfileOutlets('m1', 'p1', {});

      expect(result).toHaveLength(1);
      expect(logger.error).toHaveBeenCalledWith(
        'OutletProfileService.getProfileOutlets.getAllOutletOffersByMerchantId failed',
        expect.any(Object)
      );
    });

    it('throws wrapped http exception when merchant profile outlets query fails', async () => {
      outletProfileMappingService.getMappedOutletDetails.mockResolvedValue([{ outletId: 'o1' }]);
      outletProfileModel.findAll.mockRejectedValue(new Error('query fail'));

      await expect(service.getMerchantProfileOutlets('m1', 'p1', {})).rejects.toThrow(
        'Failed to fetch the merchant outlet profile'
      );
    });
  });

  describe('validateAndUpdateOutletProfileStatusRewardEngine', () => {
    it('delegates to validation service with reward engine', async () => {
      outletProfileValidationStatusService.validateAndUpdateOutletProfileStatus.mockResolvedValue({ status: 'ok' });

      const result = await service.validateAndUpdateOutletProfileStatusRewardEngine(
        { outletId: 'o1' } as any,
        {} as any,
        'u1'
      );

      expect(outletProfileValidationStatusService.validateAndUpdateOutletProfileStatus).toHaveBeenCalled();
      expect(result).toEqual({ status: 'ok' });
    });
  });

  describe('status validation delegation callbacks', () => {
    it('passes offer validator callback for normal status update', async () => {
      outletProfileValidationStatusService.validateAndUpdateOutletProfileStatus.mockImplementation(
        async (_dto, _token, _userId, getDetails, validate) => {
          const details = await getDetails('o1', 'p1', {});
          expect(details).toBeDefined();
          expect(() => validate({ outletNormalOffer: null, outletCustomHours: [], outletTieredOffers: null })).toThrow(
            HttpException
          );
          return { status: 'ok' };
        }
      );
      jest.spyOn(service, 'getOutletProfileMetadata').mockResolvedValue({ outletNormalOffer: {} } as any);

      await service.validateAndUpdateOutletProfileStatus({ outletId: 'o1', profileId: 'p1' } as any, {} as any, 'u1');
    });

    it('passes reward validator callback for reward-engine status update', async () => {
      outletProfileValidationStatusService.validateAndUpdateOutletProfileStatus.mockImplementation(
        async (_dto, _token, _userId, getDetails, validate) => {
          const details = await getDetails('o1', 'p1', {});
          expect(details).toBeDefined();
          expect(() => validate({ offer: { rules: [] } })).toThrow(HttpException);
          return { status: 'ok' };
        }
      );
      jest.spyOn(service, 'getOutletProfileMetadataRewardEngine').mockResolvedValue({ offer: { rules: [{}] } } as any);

      await service.validateAndUpdateOutletProfileStatusRewardEngine(
        { outletId: 'o1', profileId: 'p1' } as any,
        {} as any,
        'u1'
      );
    });

    it('passes update-count callback for normal status update', async () => {
      outletProfileValidationStatusService.validateAndUpdateOutletProfileStatus.mockImplementation(
        async (_dto, _token, _userId, _getDetails, _validate, updateCount) => {
          await updateCount('m1', 'p1', undefined);
          return { status: 'ok' };
        }
      );
      const updateSpy = jest.spyOn(service, 'updateOutletProfileCountByMerchant').mockResolvedValue(undefined);

      await service.validateAndUpdateOutletProfileStatus({ outletId: 'o1', profileId: 'p1' } as any, {} as any, 'u1');

      expect(updateSpy).toHaveBeenCalledWith('m1', 'p1', undefined);
    });

    it('passes update-count callback for reward-engine status update', async () => {
      outletProfileValidationStatusService.validateAndUpdateOutletProfileStatus.mockImplementation(
        async (_dto, _token, _userId, _getDetails, _validate, updateCount) => {
          await updateCount('m2', 'p2', undefined);
          return { status: 'ok' };
        }
      );
      const updateSpy = jest.spyOn(service, 'updateOutletProfileCountByMerchant').mockResolvedValue(undefined);

      await service.validateAndUpdateOutletProfileStatusRewardEngine(
        { outletId: 'o1', profileId: 'p1' } as any,
        {} as any,
        'u1'
      );

      expect(updateSpy).toHaveBeenCalledWith('m2', 'p2', undefined);
    });
  });

  describe('getOutletProfileActiveInactiveCount', () => {
    it('returns active and inactive counts', async () => {
      outletProfileModel.count.mockResolvedValueOnce(5).mockResolvedValueOnce(3);

      const result = await service.getOutletProfileActiveInactiveCount('m1', 'p1');

      expect(result).toEqual({ activeOutletsNum: 5, inActiveOutletNum: 3 });
    });
  });

  describe('updateOutletProfileCountByMerchant', () => {
    it('updates merchant profile outlet count', async () => {
      outletProfileModel.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
      merchantProfileService.updateMerchantProfileOutletsNumber.mockResolvedValue(undefined);

      await service.updateOutletProfileCountByMerchant('m1', 'p1');

      expect(merchantProfileService.updateMerchantProfileOutletsNumber).toHaveBeenCalledWith(
        'm1',
        'p1',
        { activeOutletsNum: 2, inActiveOutletsNum: 1 },
        undefined
      );
    });
  });

  describe('pushNodeStatusToAuditLog', () => {
    it('delegates to validation status service', async () => {
      outletProfileValidationStatusService.pushNodeStatusToAuditLog = jest.fn();

      await service.pushNodeStatusToAuditLog({} as any, {} as any);

      expect(outletProfileValidationStatusService.pushNodeStatusToAuditLog).toHaveBeenCalledWith({}, {});
    });
  });

  describe('insertOutletProfileMetadata', () => {
    it('creates new outlet profile when not exists', async () => {
      merchantProfileService.getMerchantProfileMetaData.mockResolvedValue({
        name: 'Merchant',
        nameAr: 'MerchantAr',
        desc: 'd',
        descAr: 'dar',
        merchantLogoUrl: 'url',
        filters: [],
      });
      outletAddressService.getOutletLocation.mockResolvedValue({ location: 'Dubai Mall' });
      outletProfileModel.findOrCreate.mockResolvedValue([{ id: 'op1' }, true]);
      outletProfileFilterService.addOutletProfileFilters.mockResolvedValue(undefined);
      outletPhotoService.find.mockResolvedValue([{ id: 'p1' }]);

      await service.insertOutletProfileMetadata('o1', 'p1', 'm1');

      expect(outletProfileModel.findOrCreate).toHaveBeenCalled();
      expect(outletProfileFilterService.addOutletProfileFilters).toHaveBeenCalled();
      expect(outletProfilePhotosService.insertDefaultOutletImages).toHaveBeenCalled();
    });

    it('uses merchant when profile metadata not found', async () => {
      merchantProfileService.getMerchantProfileMetaData.mockResolvedValue(null);
      merchantService.getMerchantById.mockResolvedValue({
        get: jest.fn().mockReturnValue({ name: 'M', nameAr: 'MAr', desc: 'd', filters: [] }),
      });
      outletAddressService.getOutletLocation.mockResolvedValue({ location: 'Loc' });
      outletProfileModel.findOrCreate.mockResolvedValue([{ id: 'op1' }, true]);

      await service.insertOutletProfileMetadata('o1', 'p1', 'm1');

      expect(merchantService.getMerchantById).toHaveBeenCalledWith('m1');
    });

    it('throws on insertOutletProfileMetadata error', async () => {
      merchantProfileService.getMerchantProfileMetaData.mockRejectedValue(new Error('db error'));

      await expect(service.insertOutletProfileMetadata('o1', 'p1', 'm1')).rejects.toThrow(HttpException);
    });
  });

  describe('private helper coverage', () => {
    it('falls back to merchant metadata when profile metadata is missing', async () => {
      merchantProfileService.getMerchantProfileMetaData.mockResolvedValue(null);
      merchantService.getMerchantById.mockResolvedValue({ id: 'm1', name: 'M' });

      const result = await (service as any).getMerchantProfileMetadataForOutletProfile('m1', 'p1');

      expect(merchantService.getMerchantById).toHaveBeenCalledWith('m1');
      expect(result).toEqual({ id: 'm1', name: 'M' });
    });

    it('formats offers by outlet id for all offer lists', () => {
      const outlet = { dataValues: { id: 'o1' } } as any;
      const offers = {
        data: {
          data: {
            outletBlackOutdays: [
              { merchantOutletProfile: { outletId: 'o1' } },
              { merchantOutletProfile: { outletId: 'o2' } },
            ],
            outletCustomHours: [{ merchantOutletProfile: { outletId: 'o1' } }, { merchantOutletProfile: { outletId: 'x' } }],
            outletNormalOffer: [{ merchantOutletProfile: { outletId: 'o1' } }, { merchantOutletProfile: { outletId: 'y' } }],
            outletTieredOffers: [
              { merchantOutletProfile: { outletId: 'o1' } },
              { merchantOutletProfile: { outletId: 'z' } },
            ],
          },
        },
      };

      const result = (service as any).formatOffers(offers, outlet);

      expect(result.merchantOutletsBlackOutdays).toHaveLength(1);
      expect(result.merchantOutletsCustomHours).toHaveLength(1);
      expect(result.merchantOutletsNormalOffer).toHaveLength(1);
      expect(result.merchantOutletTieredOffer).toHaveLength(1);
    });
  });

  describe('cloneOutletProfileMetadata', () => {
    it('clones outlet profile from existing', async () => {
      (OutletProfileMetadata.findOne as jest.Mock).mockResolvedValue({
        toJSON: () => ({}),
        outletProfilePhotos: [],
        outletProfileFilters: [],
      });
      (Outlet.findOne as jest.Mock).mockResolvedValue({ toJSON: () => ({}) });
      (OutletAddress.findOne as jest.Mock).mockResolvedValue({});
      (OutletTiming.findOne as jest.Mock).mockResolvedValue({});
      outletProfileModel.findOrCreate.mockResolvedValue([
        {
          id: 'op1',
          outletDetails: { merchantName: 'M', name: 'Copy 1' },
          outletProfileFilters: [],
          outletProfilePhotos: [],
        },
        true,
      ]);

      await service.cloneOutletProfileMetadata('o2', 'p1', 'm1', 'o1', 'u1');

      expect(outletProfileFilterService.cloneOutletProfileFilters).toHaveBeenCalled();
    });

    it('throws on cloneOutletProfileMetadata error', async () => {
      (OutletProfileMetadata.findOne as jest.Mock).mockRejectedValue(new Error('not found'));

      await expect(service.cloneOutletProfileMetadata('o2', 'p1', 'm1', 'o1', 'u1')).rejects.toThrow(HttpException);
    });

    it('clones profile photos when existing photos are present', async () => {
      (OutletProfileMetadata.findOne as jest.Mock).mockResolvedValue({
        toJSON: () => ({}),
        outletProfilePhotos: [{ id: 'ph1' }],
        outletProfileFilters: [],
      });
      (Outlet.findOne as jest.Mock).mockResolvedValue({ toJSON: () => ({}) });
      (OutletAddress.findOne as jest.Mock).mockResolvedValue({});
      (OutletTiming.findOne as jest.Mock).mockResolvedValue({});
      outletProfileModel.findOrCreate.mockResolvedValue([{ id: 'op1' }, true]);

      await service.cloneOutletProfileMetadata('o2', 'p1', 'm1', 'o1', 'u1');

      expect(outletProfilePhotosService.cloneProfileOutletImages).toHaveBeenCalled();
    });
  });

  describe('resetOutletProfileDetails', () => {
    it('resets outlet profile and returns metadata', async () => {
      merchantProfileService.getMerchantProfileMetaData.mockResolvedValue({
        name: 'M',
        nameAr: 'MAr',
        desc: 'd',
        descAr: 'dar',
        filters: [],
      });
      outletPhotoService.find.mockResolvedValue([{ id: 'p1' }]);
      outletAddressService.getOutletLocation.mockResolvedValue({ location: 'Loc' });
      sequelize.transaction.mockImplementation((fn: (t: any) => Promise<any>) => fn({}));
      outletProfileModel.findOne.mockResolvedValue({
        get: jest.fn().mockReturnValue({ id: '1', outlet: {} }),
      });
      outletOfferProxy.getOutletAllOffers.mockResolvedValue({ data: { data: {} } });
      fastPaymentServiceProxy.getOutletTabs.mockResolvedValue({});
      fastPaymentServiceProxy.getOutletPriceConfig.mockResolvedValue({});
      fastPaymentServiceProxy.getOutlet.mockResolvedValue({});
      fastPaymentServiceProxy.getOutletConfig.mockResolvedValue({});
      posServiceProxy.getPosConfig.mockResolvedValue({});

      const dto = { merchantId: 'm1', profileId: 'p1', outletId: 'o1', id: 'op1' } as any;
      const result = await service.resetOutletProfileDetails(dto, 'u1', {});

      expect(outletProfileModel.update).toHaveBeenCalled();
      expect(outletProfileFilterService.addOutletProfileFilters).toHaveBeenCalled();
      expect(outletProfilePhotosService.deleteOutletProfilePhotosByOutletProfileId).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('throws on resetOutletProfileDetails error', async () => {
      merchantProfileService.getMerchantProfileMetaData.mockRejectedValue(new Error('fail'));

      const dto = { merchantId: 'm1', profileId: 'p1', outletId: 'o1', id: 'op1' } as any;
      await expect(service.resetOutletProfileDetails(dto, 'u1', {})).rejects.toThrow(HttpException);
    });

    it('uses merchant fallback when merchant profile metadata is not found', async () => {
      merchantProfileService.getMerchantProfileMetaData.mockResolvedValue(null);
      merchantService.getMerchantById.mockResolvedValue({
        get: jest.fn().mockReturnValue({ name: 'M', nameAr: 'MA', desc: 'd', descAr: 'da', filters: [] }),
      });
      outletPhotoService.find.mockResolvedValue([]);
      outletAddressService.getOutletLocation.mockResolvedValue({ location: 'Loc' });
      sequelize.transaction.mockImplementation((fn: (t: any) => Promise<any>) => fn({}));
      outletProfileModel.findOne.mockResolvedValue({
        get: jest.fn().mockReturnValue({ id: '1', outlet: {} }),
      });
      outletOfferProxy.getOutletAllOffers.mockResolvedValue({ data: { data: {} } });
      fastPaymentServiceProxy.getOutletTabs.mockResolvedValue({});
      fastPaymentServiceProxy.getOutletPriceConfig.mockResolvedValue({});
      fastPaymentServiceProxy.getOutlet.mockResolvedValue({});
      fastPaymentServiceProxy.getOutletConfig.mockResolvedValue({});
      posServiceProxy.getPosConfig.mockResolvedValue({});

      await service.resetOutletProfileDetails(
        { merchantId: 'm1', profileId: 'p1', outletId: 'o1', id: 'op1' } as any,
        'u1',
        {}
      );

      expect(merchantService.getMerchantById).toHaveBeenCalledWith('m1');
    });
  });

  describe('error-only branch methods', () => {
    it('logs error in updateStatusForProfile when update fails', async () => {
      outletProfileModel.update.mockRejectedValue(new Error('fail'));
      await service.updateStatusForProfile('o1', 'p1', OutletProfileStatusEnum.Active);
      expect(logger.error).toHaveBeenCalledWith(
        'OutletProfileService.updateStatusForProfile - exception',
        expect.objectContaining({ error: expect.any(Error), outletId: 'o1', profileId: 'p1' })
      );
    });

    it('logs and returns undefined when findOutletsByIdandProfile fails', async () => {
      outletProfileModel.findAll.mockRejectedValue(new Error('fail'));
      const result = await service.findOutletsByIdandProfile(['1'], 'p1');
      expect(result).toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith('OutletProfileService.findOutletsByIdandProfile - exception', {
        error: expect.any(Error),
      });
    });

    it('logs and returns undefined when findOutletProfilesForFilters fails', async () => {
      outletProfileModel.findAll.mockRejectedValue(new Error('fail'));
      const result = await service.findOutletProfilesForFilters(['f1'], 'p1');
      expect(result).toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith('OutletProfileService.findOutletProfilesForFilters - exception', {
        error: expect.any(Error),
      });
    });

    it('logs errors in updateOfferDetails and updateOutletOffer', async () => {
      outletProfileModel.update.mockRejectedValue(new Error('fail'));
      await service.updateOfferDetails('o1', 10, true, 'p1');
      await service.updateOutletOffer({ maxOffer: 1 }, ['o1'], 'p1');
      expect(logger.error).toHaveBeenCalledWith('OutletProfileService.updateOfferDetails - exception', {
        error: expect.any(Error),
      });
      expect(logger.error).toHaveBeenCalledWith('OutletProfileService.updateOutletOffer - exception', {
        error: expect.any(Error),
      });
    });
  });

  describe('updateMerchantProfileDataToOutletProfile error', () => {
    it('throws on update error', async () => {
      outletProfileModel.update.mockRejectedValue(new Error('db error'));

      await expect(
        service.updateMerchantProfileDataToOutletProfile(
          { merchantId: 'm1', profileId: 'p1', merchantName: 'M', updatedBy: 'u1' } as any,
          [],
          {} as any
        )
      ).rejects.toThrow(HttpException);
    });
  });

  describe('createOrUpdateOutletProfileMetadata error', () => {
    it('rolls back transaction on error', async () => {
      merchantProfileService.getMerchantProfileMetaData.mockResolvedValue({ name: 'M', filters: [] });
      const mockTransaction = { commit: jest.fn(), rollback: jest.fn().mockResolvedValue(undefined) };
      sequelize.transaction.mockResolvedValue(mockTransaction);
      outletProfileModel.create.mockRejectedValue(new Error('create fail'));

      const dto = { merchantId: 'm1', profileId: 'p1', outletId: 'o1' } as any;
      await expect(service.createOrUpdateOutletProfileMetadata(dto, 'u1')).rejects.toThrow(HttpException);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });
});
