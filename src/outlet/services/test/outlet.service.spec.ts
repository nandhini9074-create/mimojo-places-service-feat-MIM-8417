import { OutletService } from '../outlet.service';
import { Op } from 'sequelize';
import { EnvKeysEnum } from 'config/env.enum';
import { ProfileEnum } from '../../enums/profile-enum';

describe('OutletService', () => {
  const outletModel = { create: jest.fn(), update: jest.fn(), findAll: jest.fn() } as any;
  const outletFilterService = {
    addClonedOutletFilters: jest.fn(),
    addOutletFilters: jest.fn(),
    handleOutletNotCustomizedFiltersChange: jest.fn(),
  } as any;
  const outletGetService = {
    getOutletWithIdRaw: jest.fn(),
    getOutletActiveInactiveCount: jest.fn(),
    getAllOutletsByMerchantId: jest.fn(),
  } as any;
  const outletHelperService = {
    mapFilterDto: jest.fn(),
    updateOutletMerchantName: jest.fn(),
    updateOutletMerchantLogo: jest.fn(),
    updateOutletMerchantDesc: jest.fn(),
    updateOutletArtDesc: jest.fn(),
    updateOutletCompetitorDesc: jest.fn(),
  } as any;
  const outletOfferProxy = { createOutletDefaultOffers: jest.fn(), cloneDefaultOffer: jest.fn() } as any;
  const fastPaymentServiceProxy = { upsertFastPaymentStatus: jest.fn() } as any;
  const outletProfileMappingService = {
    findAllOutletsByTransactionDate: jest.fn(),
    findOneByTransactionDate: jest.fn(),
    create: jest.fn(),
    clone: jest.fn(),
    insertToOutletProfileMetadata: jest.fn(),
    cloneToOutletProfileMetadata: jest.fn(),
    findOrCreate: jest.fn(),
  } as any;
  const profileService = { findByNames: jest.fn(), findByName: jest.fn() } as any;
  const logger = { info: jest.fn(), error: jest.fn() } as any;
  const merchantService = {
    getMerchantById: jest.fn(),
    updateMerchantOutletsNumber: jest.fn(),
    getActiveFabMerchants: jest.fn(),
  } as any;
  const outletProfileService = { updateOfferDetails: jest.fn(), updateOutletOffer: jest.fn() } as any;
  const outletPhotoService = { cloneOutletPhotos: jest.fn() } as any;
  const outletCustomCrudService = { addEditCustomOutlet: jest.fn(), cloneOutlet: jest.fn() } as any;
  const outletStatusService = {
    validateAndUpdateOutletStatus: jest.fn(),
    validateAndUpdateOutletStatusRewardEngine: jest.fn(),
    updateFastPaymentStatus: jest.fn(),
    updateOutletsStatus: jest.fn(),
  } as any;
  const outletCoreSyncService = {
    updateCoreMerchantOutlet: jest.fn(),
    syncPoiOutletToCore: jest.fn(),
    syncCustomOutletToCore: jest.fn(),
  } as any;
  const outletAuditFinanceService = {
    pushOutletToAuditLog: jest.fn(),
    pushNodeStatusToAuditLog: jest.fn(),
    pushOutletToFinance: jest.fn(),
    pushOutletActiveStatusToKafka: jest.fn(),
  } as any;

  let service: OutletService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env[EnvKeysEnum.MIMOJO_PROFILE_ID] = 'mimojo-profile';
    service = new OutletService(
      outletModel,
      outletFilterService,
      outletGetService,
      outletHelperService,
      outletOfferProxy,
      fastPaymentServiceProxy,
      outletProfileMappingService,
      profileService,
      logger,
      merchantService,
      outletProfileService,
      outletPhotoService,
      outletCustomCrudService,
      outletStatusService,
      outletCoreSyncService,
      outletAuditFinanceService
    );
  });

  it('delegates addEditCustomOutlet', async () => {
    outletCustomCrudService.addEditCustomOutlet.mockResolvedValue({ outletId: 'o1' });
    const result = await service.addEditCustomOutlet({} as any, {} as any, {} as any, 'u1');
    expect(outletCustomCrudService.addEditCustomOutlet).toHaveBeenCalled();
    expect(result).toEqual({ outletId: 'o1' });
  });

  it('updates max offers and calls outlet profile update', async () => {
    await service.updateMaxOffer([
      { outletId: 'o1', consumerSplitValue: 10, hasCustomOffer: true, profileId: 'mimojo-profile' },
      { outletId: 'o2', consumerSplitValue: 20, hasCustomOffer: false, profileId: 'other-profile' },
    ]);

    expect(outletModel.update).toHaveBeenCalledTimes(1);
    expect(outletProfileService.updateOfferDetails).toHaveBeenCalledTimes(2);
  });

  it('delegates createOffer and cloneOffer', () => {
    service.createOffer('m1', 'o1', 'Outlet 1', 'u1');
    service.cloneOffer({ oldOutletId: 'o1', newOutletId: 'o2' } as any);

    expect(outletOfferProxy.createOutletDefaultOffers).toHaveBeenCalledWith('m1', 'o1', 'Outlet 1', 'u1');
    expect(outletOfferProxy.cloneDefaultOffer).toHaveBeenCalled();
  });

  it('updates merchant outlet count', async () => {
    outletGetService.getOutletActiveInactiveCount.mockResolvedValue({ activeOutletsNum: 3, inActiveOutletNum: 2 });

    await service.updateOutletCountByMerchant('m1');

    expect(merchantService.updateMerchantOutletsNumber).toHaveBeenCalledWith('m1', {
      activeOutletsNum: 3,
      inActiveOutletsNum: 2,
    });
  });

  it('updates merchant outlet max offer and returns not found response when no rows', async () => {
    outletModel.update.mockResolvedValue([0, []]);

    const result = await service.updateMerchantOutletMaxOffer({ merchantId: 'm1', maxOffer: 10 } as any, {} as any, 'u1');

    expect(result.message).toBe('Error');
    expect(result.statusCode).toBe(404);
  });

  it('updates outlet max offer via outlet profile service', async () => {
    await service.updateOutletMaxOffer(
      { outletIds: ['o1', 'o2'], maxOffer: 11, hasCustomOffer: true, profileId: 'mimojo-profile' } as any,
      'u1'
    );

    expect(outletModel.update).toHaveBeenCalledWith(
      { updatedBy: 'u1', maxOffer: 11, hasCustomOffer: true },
      { where: { outletId: { [Op.in]: ['o1', 'o2'] } } }
    );
    expect(outletProfileService.updateOutletOffer).toHaveBeenCalled();
  });

  it('returns null when no profile mappings found', async () => {
    outletProfileMappingService.findAllOutletsByTransactionDate.mockResolvedValue([]);

    const result = await service.getAllOutletsProfiles('o1', new Date());

    expect(result).toBeNull();
  });

  it('finds outlets by ids', async () => {
    outletModel.findAll.mockResolvedValue([{ merchantId: 'm1', outletId: 'o1' }]);

    const result = await service.findOutletsByIds(['o1']);

    expect(outletModel.findAll).toHaveBeenCalledWith({
      where: { outletId: { [Op.in]: ['o1'] } },
      attributes: ['merchantId', 'outletId'],
      raw: true,
    });
    expect(result).toEqual([{ merchantId: 'm1', outletId: 'o1' }]);
  });

  describe('cloneOutlet', () => {
    it('clones outlet successfully', async () => {
      const originalOutlet = {
        outletId: 'o1',
        name: 'Original',
        hasClone: false,
        merchantId: 'm1',
        rating: 5,
        priceLevel: 1,
        website: 'http://x.com',
        formattedPhoneNumber: '123',
        businessStatus: 'OPEN',
        userRatingsTotal: 10,
        status: 'Active',
        source: 'POI',
        menuUrl: null,
        bookingUrl: null,
        merchantLogoUrl: null,
        maxOffer: 10,
        outletNo: '1',
        hasCustomOffer: false,
        fastPaymentStatus: 'PENDING',
        updatedBy: 'u1',
        nameAr: 'OriginalAr',
        merchantName: 'Merchant',
        merchantNameAr: 'MerchantAr',
        menuUrlAr: null,
        bookingUrlAr: null,
        websiteAr: null,
        descriptionAr: null,
        artDesc: [],
        competitorDesc: [],
      } as any;
      const newOutlet = { outletId: 'o2', name: 'Original (Copy)', merchantId: 'm1', fastPaymentStatus: 'PENDING' } as any;
      outletGetService.getOutletWithIdRaw.mockResolvedValue(originalOutlet);
      outletModel.create.mockResolvedValue(newOutlet);
      fastPaymentServiceProxy.upsertFastPaymentStatus.mockResolvedValue({});

      const result = await service.cloneOutlet('o1', 'u1', {} as any, {} as any);

      expect(result.newOutlet).toEqual(newOutlet);
      expect(result.oldOutletName).toBe('Original');
      expect(outletFilterService.addClonedOutletFilters).toHaveBeenCalled();
      expect(outletPhotoService.cloneOutletPhotos).toHaveBeenCalled();
    });

    it('throws when outlet already has clone', async () => {
      outletGetService.getOutletWithIdRaw.mockResolvedValue({ hasClone: true, name: 'X' } as any);

      await expect(service.cloneOutlet('o1', 'u1', {} as any, {} as any)).rejects.toThrow(
        'Outlet already has a clone. Cannot clone again'
      );
    });

    it('throws with error message on exception', async () => {
      outletGetService.getOutletWithIdRaw.mockRejectedValue(new Error('DB error'));

      await expect(service.cloneOutlet('o1', 'u1', {} as any, {} as any)).rejects.toThrow(
        expect.objectContaining({ message: 'DB error' })
      );
    });
  });

  describe('markAsHasClone', () => {
    it('marks outlet as has clone', async () => {
      outletModel.update.mockResolvedValue([1]);

      await service.markAsHasClone('o1');

      expect(outletModel.update).toHaveBeenCalledWith({ hasClone: true }, { where: { outletId: 'o1' } });
    });

    it('throws on error', async () => {
      outletModel.update.mockRejectedValue(new Error('Update failed'));

      await expect(service.markAsHasClone('o1')).rejects.toThrow(expect.objectContaining({ message: 'Update failed' }));
    });
  });

  describe('updateMaxOffer', () => {
    it('skips outletModel update when profileId is not mimojo', async () => {
      await service.updateMaxOffer([
        { outletId: 'o1', consumerSplitValue: 10, hasCustomOffer: true, profileId: 'other-profile' },
      ]);

      expect(outletModel.update).not.toHaveBeenCalled();
      expect(outletProfileService.updateOfferDetails).toHaveBeenCalledWith('o1', 10, true, 'other-profile');
    });

    it('skips outletModel update when outletId or consumerSplitValue missing', async () => {
      await service.updateMaxOffer([
        { outletId: '', consumerSplitValue: 10, hasCustomOffer: true, profileId: 'mimojo-profile' },
        { outletId: 'o2', consumerSplitValue: undefined, hasCustomOffer: false, profileId: 'mimojo-profile' },
      ]);

      expect(outletModel.update).not.toHaveBeenCalled();
      expect(outletProfileService.updateOfferDetails).not.toHaveBeenCalled();
    });

    it('throws on error', async () => {
      outletModel.update.mockResolvedValue([1]);
      outletProfileService.updateOfferDetails.mockRejectedValue(new Error('Profile error'));

      await expect(
        service.updateMaxOffer([
          { outletId: 'o1', consumerSplitValue: 10, hasCustomOffer: true, profileId: 'mimojo-profile' },
        ])
      ).rejects.toThrow('Profile error');
    });
  });

  describe('insertOutletFromPoi', () => {
    it('creates outlet from POI data', async () => {
      const merchant = {
        merchantId: 'm1',
        name: 'Merchant',
        nameAr: 'MerchantAr',
        imageUrl: 'http://logo.com',
        desc: 'Desc',
        descAr: 'DescAr',
        artDesc: [],
        competitorDesc: [],
        status: 'ENROLLED',
        fastPaymentStatus: 'PENDING',
      };
      const outlet = {
        outletId: 'o1',
        name: 'Outlet',
        merchantId: 'm1',
        fastPaymentStatus: 'PENDING',
      } as any;
      const data = {
        merchantId: 'm1',
        name: 'Outlet',
        nameAr: 'OutletAr',
        rating: 5,
        priceLevel: 1,
        website: 'http://x.com',
        websiteAr: 'http://x.com',
        formattedPhoneNumber: '123',
        businessStatus: 'OPEN',
        userRatingsTotal: 10,
        menuUrl: 'http://menu.com',
        menuUrlAr: 'http://menu.com',
        bookingUrl: null,
        bookingUrlAr: null,
        outletAddress: { location: 'Loc' },
      } as any;
      merchantService.getMerchantById.mockResolvedValue(merchant);
      outletHelperService.mapFilterDto.mockReturnValue([]);
      outletModel.create.mockResolvedValue(outlet);
      fastPaymentServiceProxy.upsertFastPaymentStatus.mockResolvedValue({});

      const result = await service.insertOutletFromPoi(data, {} as any, {} as any, 'u1');

      expect(result).toEqual(outlet);
      expect(outletFilterService.addOutletFilters).toHaveBeenCalled();
      expect(outletCoreSyncService.updateCoreMerchantOutlet).toHaveBeenCalled();
    });

    it('uses NOT ENROLLED status when merchant not enrolled', async () => {
      merchantService.getMerchantById.mockResolvedValue({
        name: 'M',
        nameAr: 'MAr',
        status: 'NOT ENROLLED',
        fastPaymentStatus: 'NOT ENROLLED',
        imageUrl: null,
        desc: null,
        descAr: null,
        artDesc: [],
        competitorDesc: [],
      });
      outletHelperService.mapFilterDto.mockReturnValue([]);
      outletModel.create.mockResolvedValue({ outletId: 'o1' } as any);
      fastPaymentServiceProxy.upsertFastPaymentStatus.mockResolvedValue({});

      await service.insertOutletFromPoi(
        { merchantId: 'm1', name: 'O', outletAddress: {} } as any,
        {} as any,
        {} as any,
        'u1'
      );

      expect(outletModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'Not Enrolled',
          fastPaymentStatus: 'NOT ENROLLED',
        }),
        expect.any(Object)
      );
    });
  });

  describe('sync methods', () => {
    it('syncPoiOutletToCore delegates to outletCoreSyncService', async () => {
      outletCoreSyncService.syncPoiOutletToCore.mockResolvedValue(undefined);

      await service.syncPoiOutletToCore({} as any, {} as any, {} as any);

      expect(outletCoreSyncService.syncPoiOutletToCore).toHaveBeenCalled();
    });

    it('syncCustomOutletToCore delegates to outletCoreSyncService', async () => {
      outletCoreSyncService.syncCustomOutletToCore.mockResolvedValue(undefined);

      await service.syncCustomOutletToCore({} as any, {} as any, {} as any);

      expect(outletCoreSyncService.syncCustomOutletToCore).toHaveBeenCalled();
    });
  });

  describe('validateAndUpdateOutletStatus', () => {
    it('delegates to outletStatusService', async () => {
      outletStatusService.validateAndUpdateOutletStatus.mockResolvedValue({ outletId: 'o1' } as any);

      const result = await service.validateAndUpdateOutletStatus({} as any, {} as any, 'u1');

      expect(outletStatusService.validateAndUpdateOutletStatus).toHaveBeenCalled();
      expect(result).toEqual({ outletId: 'o1' });
    });

    it('wires status side effects callbacks to audit-finance service', async () => {
      outletStatusService.validateAndUpdateOutletStatus.mockImplementation(async (_data, _token, _userId, sideEffects) => {
        await sideEffects.pushOutletToFinance('m1', { id: 'o1' }, 'Dubai', {});
        sideEffects.pushOutletActiveStatusToKafka('m1', 'o1', 'p1');
        sideEffects.pushNodeStatusToAuditLog({ outletId: 'o1' }, { outletId: 'o1' });
        await sideEffects.updateOutletCountByMerchant('m1');
        return { outletId: 'o1' };
      });
      outletGetService.getOutletActiveInactiveCount.mockResolvedValue({ activeOutletsNum: 1, inActiveOutletNum: 2 });

      await service.validateAndUpdateOutletStatus({} as any, {} as any, 'u1');

      expect(outletAuditFinanceService.pushOutletToFinance).toHaveBeenCalledWith('m1', { id: 'o1' }, 'Dubai', {});
      expect(outletAuditFinanceService.pushOutletActiveStatusToKafka).toHaveBeenCalledWith('m1', 'o1', 'p1');
      expect(outletAuditFinanceService.pushNodeStatusToAuditLog).toHaveBeenCalledWith(
        { outletId: 'o1' },
        { outletId: 'o1' }
      );
      expect(merchantService.updateMerchantOutletsNumber).toHaveBeenCalled();
    });
  });

  describe('validateAndUpdateOutletStatusRewardEngine', () => {
    it('delegates to outletStatusService', async () => {
      outletStatusService.validateAndUpdateOutletStatusRewardEngine.mockResolvedValue({ outletId: 'o1' } as any);

      const result = await service.validateAndUpdateOutletStatusRewardEngine({} as any, {} as any, 'u1');

      expect(outletStatusService.validateAndUpdateOutletStatusRewardEngine).toHaveBeenCalled();
      expect(result).toEqual({ outletId: 'o1' });
    });
  });

  describe('updateFastPaymentStatus', () => {
    it('delegates to outletStatusService', async () => {
      outletStatusService.updateFastPaymentStatus.mockResolvedValue({ outletId: 'o1' } as any);

      const result = await service.updateFastPaymentStatus({} as any, {} as any, 'u1');

      expect(outletStatusService.updateFastPaymentStatus).toHaveBeenCalled();
      expect(result).toEqual({ outletId: 'o1' });
    });
  });

  describe('updateMerchantOutletMaxOffer', () => {
    it('returns updated outlet when rows affected', async () => {
      const updatedOutlet = { outletId: 'o1', maxOffer: 15 } as any;
      outletModel.update.mockResolvedValue([2, [updatedOutlet]]);

      const result = await service.updateMerchantOutletMaxOffer({ merchantId: 'm1', maxOffer: 15 } as any, {} as any, 'u1');

      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual(updatedOutlet);
    });
  });

  describe('updateOutletMaxOffer', () => {
    it('only updates outlet profile when profileId is not mimojo', async () => {
      await service.updateOutletMaxOffer({ outletIds: ['o1'], maxOffer: 5, profileId: 'other-profile' } as any, 'u1');

      expect(outletModel.update).not.toHaveBeenCalled();
      expect(outletProfileService.updateOutletOffer).toHaveBeenCalledWith(
        { updatedBy: 'u1', maxOffer: 5 },
        ['o1'],
        'other-profile'
      );
    });
  });

  describe('updateMerchantMetadataToOutlet', () => {
    it('updates all merchant metadata fields', async () => {
      outletGetService.getAllOutletsByMerchantId.mockResolvedValue([
        { outletId: 'o1', name: 'O1', nameAr: 'O1Ar', outletAddress: { areaId: 'a1', location: 'Loc' } },
      ]);
      merchantService.getMerchantById.mockResolvedValue({
        name: 'M',
        country: 'SA',
        nameAr: 'MAr',
      });

      await service.updateMerchantMetadataToOutlet(
        {
          merchantId: 'm1',
          merchantName: 'NewName',
          merchantLogoUrl: 'http://logo.com',
          desc: 'Desc',
          artDesc: [],
          competitorDesc: [],
        } as any,
        {} as any,
        'u1',
        {} as any
      );

      expect(outletHelperService.updateOutletMerchantName).toHaveBeenCalled();
      expect(outletHelperService.updateOutletMerchantLogo).toHaveBeenCalled();
      expect(outletHelperService.updateOutletMerchantDesc).toHaveBeenCalled();
      expect(outletHelperService.updateOutletArtDesc).toHaveBeenCalled();
      expect(outletHelperService.updateOutletCompetitorDesc).toHaveBeenCalled();
      expect(outletFilterService.handleOutletNotCustomizedFiltersChange).toHaveBeenCalled();
      expect(outletCoreSyncService.updateCoreMerchantOutlet).toHaveBeenCalled();
    });

    it('skips fields when not provided', async () => {
      outletGetService.getAllOutletsByMerchantId.mockResolvedValue([]);

      await service.updateMerchantMetadataToOutlet({ merchantId: 'm1' } as any, {} as any, 'u1');

      expect(outletHelperService.updateOutletMerchantName).not.toHaveBeenCalled();
      expect(outletHelperService.updateOutletMerchantLogo).not.toHaveBeenCalled();
    });

    it('logs error when core sync fails', async () => {
      outletGetService.getAllOutletsByMerchantId.mockResolvedValue([
        { outletId: 'o1', name: 'O1', nameAr: null, outletAddress: { areaId: null, location: null } },
      ]);
      merchantService.getMerchantById.mockRejectedValue(new Error('Merchant not found'));

      await service.updateMerchantMetadataToOutlet({ merchantId: 'm1' } as any, {} as any, 'u1', {} as any);

      expect(logger.error).toHaveBeenCalledWith('Error updating merchant metadata to outlet', expect.any(Object));
    });
  });

  describe('updateOutletsStatus', () => {
    it('delegates to outletStatusService', async () => {
      outletStatusService.updateOutletsStatus.mockResolvedValue(undefined);

      await service.updateOutletsStatus({} as any, {} as any, {} as any, 'u1');

      expect(outletStatusService.updateOutletsStatus).toHaveBeenCalled();
    });
  });

  describe('audit methods', () => {
    it('pushOutletToAuditLog delegates', () => {
      service.pushOutletToAuditLog({} as any, true, false);

      expect(outletAuditFinanceService.pushOutletToAuditLog).toHaveBeenCalledWith({}, true, false);
    });

    it('pushNodeStatusToAuditLog delegates', async () => {
      outletAuditFinanceService.pushNodeStatusToAuditLog.mockResolvedValue(undefined);

      await service.pushNodeStatusToAuditLog({} as any, {} as any);

      expect(outletAuditFinanceService.pushNodeStatusToAuditLog).toHaveBeenCalled();
    });
  });

  describe('getActiveOutletProfile', () => {
    it('returns profile mapping', async () => {
      outletProfileMappingService.findOneByTransactionDate.mockResolvedValue({ outletId: 'o1' });

      const result = await service.getActiveOutletProfile('o1', 'p1', new Date(), '1234');

      expect(outletProfileMappingService.findOneByTransactionDate).toHaveBeenCalledWith(
        'o1',
        'p1',
        expect.any(Date),
        '1234'
      );
      expect(result).toEqual({ outletId: 'o1' });
    });
  });

  describe('getAllOutletsProfiles', () => {
    it('returns profile mappings when found', async () => {
      outletProfileMappingService.findAllOutletsByTransactionDate.mockResolvedValue([{ outletId: 'o1' }]);

      const result = await service.getAllOutletsProfiles('o1', new Date());

      expect(result).toEqual([{ outletId: 'o1' }]);
    });
  });

  describe('createOutletProfile', () => {
    it('creates mimojo and eib profiles', async () => {
      profileService.findByNames.mockResolvedValue([{ id: 'mp1' }, { id: 'ep1' }]);

      await service.createOutletProfile('o1', ProfileEnum.MIMOJO, 'u1', 'm1');

      expect(profileService.findByNames).toHaveBeenCalledWith([ProfileEnum.MIMOJO, ProfileEnum.EIB]);
      expect(outletProfileMappingService.create).toHaveBeenCalledTimes(2);
      expect(outletProfileMappingService.insertToOutletProfileMetadata).toHaveBeenCalledTimes(2);
    });
  });

  describe('createOutletProfileClone', () => {
    it('clones profile mappings', async () => {
      profileService.findByNames.mockResolvedValue([{ id: 'mp1' }, { id: 'ep1' }]);

      await service.createOutletProfileClone('o2', 'u1', 'o1', 'm1');

      expect(profileService.findByNames).toHaveBeenCalledWith([ProfileEnum.MIMOJO, ProfileEnum.EIB]);
      expect(outletProfileMappingService.clone).toHaveBeenCalledTimes(2);
      expect(outletProfileMappingService.cloneToOutletProfileMetadata).toHaveBeenCalledTimes(2);
    });

    it('catches and logs error', async () => {
      profileService.findByNames.mockRejectedValue(new Error('Profile error'));

      await service.createOutletProfileClone('o2', 'u1', 'o1');

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('createOutletProfileById', () => {
    it('calls findOrCreate', async () => {
      outletProfileMappingService.findOrCreate.mockResolvedValue(undefined);

      await service.createOutletProfileById('o1', 'p1', 'u1');

      expect(outletProfileMappingService.findOrCreate).toHaveBeenCalledWith({
        outletId: 'o1',
        profileId: 'p1',
        isActive: true,
        startDate: null,
        endDate: null,
        updatedBy: 'u1',
      });
    });
  });

  describe('getMerchantOutletDetails', () => {
    it('returns aggregated merchant outlet details', async () => {
      outletModel.findAll.mockResolvedValue([
        {
          merchantId: 'm1',
          merchantName: 'Merchant 1',
          totalOutletCount: 2,
          outletDetails: 'o1::Outlet 1|||o2::Outlet 2',
        },
      ]);

      const result = await service.getMerchantOutletDetails();

      expect(outletModel.findAll).toHaveBeenCalled();
      expect(result).toEqual([
        {
          merchantId: 'm1',
          merchantName: 'Merchant 1',
          totalOutletCount: 2,
          outletDetails: [
            { outletId: 'o1', outletName: 'Outlet 1' },
            { outletId: 'o2', outletName: 'Outlet 2' },
          ],
        },
      ]);
    });
  });

  describe('findOutletsByIds', () => {
    it('throws on error', async () => {
      outletModel.findAll.mockRejectedValue(new Error('DB error'));

      await expect(service.findOutletsByIds(['o1'])).rejects.toThrow('DB error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getActiveFabOutlets', () => {
    it('returns active FAB outlets', async () => {
      const profile = { id: 'fab-profile' };
      const outlet = {
        get: jest.fn().mockReturnValue({
          outletId: 'o1',
          merchantId: 'm1',
          website: 'w',
          formattedPhoneNumber: 'p',
          outletAddress: {
            latitude: 1,
            longitude: 2,
            location: 'Loc',
            neighbourhood: { area: { areaName: 'Area' }, neighbourhoodName: 'N' },
          },
          profileOutlets: [{ outletId: 'o1', merchantName: 'M', name: 'O', maxOffer: 10, hasCustomOffer: true }],
          merchant: { merchantProfiles: [], get: jest.fn().mockReturnValue({}) },
        }),
      };
      profileService.findByName.mockResolvedValue(profile);
      outletModel.findAll.mockResolvedValue([outlet]);
      merchantService.getActiveFabMerchants.mockResolvedValue([{ id: 'm1', get: jest.fn().mockReturnValue({ id: 'm1' }) }]);

      const result = await service.getActiveFabOutlets();

      expect(profileService.findByName).toHaveBeenCalledWith(ProfileEnum.FAB);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('throws when profile not found', async () => {
      profileService.findByName.mockResolvedValue(null);

      await expect(service.getActiveFabOutlets()).rejects.toThrow('Profile not found');
    });

    it('throws on error', async () => {
      profileService.findByName.mockRejectedValue(new Error('Profile error'));

      await expect(service.getActiveFabOutlets()).rejects.toThrow('Profile error');
    });

    it('maps and sorts active fab outlets by merchant name', async () => {
      profileService.findByName.mockResolvedValue({ id: 'fab-profile' });
      const outletA = {
        merchantId: 'm1',
        get: jest.fn().mockReturnValue({
          merchantId: 'm1',
          website: 'a',
          formattedPhoneNumber: '1',
          outletId: 'o1',
          outletAddress: { latitude: 1, longitude: 1, location: 'L1', neighbourhood: { area: { areaName: 'City' } } },
          profileOutlets: [
            { outletId: 'o1', merchantName: 'B Merchant', name: 'Outlet B', maxOffer: 1, hasCustomOffer: false },
          ],
        }),
      };
      const outletB = {
        merchantId: 'm2',
        get: jest.fn().mockReturnValue({
          merchantId: 'm2',
          website: 'b',
          formattedPhoneNumber: '2',
          outletId: 'o2',
          outletAddress: { latitude: 2, longitude: 2, location: 'L2', neighbourhood: { area: { areaName: 'City' } } },
          profileOutlets: [
            { outletId: 'o2', merchantName: 'A Merchant', name: 'Outlet A', maxOffer: 2, hasCustomOffer: true },
          ],
        }),
      };
      outletModel.findAll.mockResolvedValue([outletA, outletB]);
      merchantService.getActiveFabMerchants.mockResolvedValue([
        { id: 'm1', get: jest.fn().mockReturnValue({ id: 'm1', merchantProfiles: [] }) },
        { id: 'm2', get: jest.fn().mockReturnValue({ id: 'm2', merchantProfiles: [] }) },
      ]);

      const result = (await service.getActiveFabOutlets()) as any[];

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({ merchantName: 'A Merchant', outletId: 'o2' }));
      expect(result[1]).toEqual(expect.objectContaining({ merchantName: 'B Merchant', outletId: 'o1' }));
    });
  });
});
