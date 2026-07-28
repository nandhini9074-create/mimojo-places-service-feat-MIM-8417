import { OutletCoreSyncService } from '../outlet-core-sync.service';
import { Outlet } from 'src/outlet/models/outlet.model';

describe('OutletCoreSyncService', () => {
  const areaService = { findById: jest.fn() } as any;
  const outletGetService = { getOutletNo: jest.fn() } as any;
  const coreMerchantOutletProxy = { updateOutletInCore: jest.fn() } as any;
  const merchantService = { getMerchantById: jest.fn() } as any;

  let service: OutletCoreSyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OutletCoreSyncService(areaService, outletGetService, coreMerchantOutletProxy, merchantService);
  });

  describe('getMerchantAndOutletNamesForCoreSync', () => {
    it('returns merchant and outlet names from metadata', async () => {
      const merchantMetadata = {
        name: 'Merchant',
        nameAr: 'التاجر',
        imageUrl: 'https://logo.png',
      } as any;
      const outlet = { name: 'Outlet', nameAr: 'المتجر' } as Outlet;

      merchantService.getMerchantById.mockResolvedValue(merchantMetadata);

      const result = await service.getMerchantAndOutletNamesForCoreSync('merchant-1', outlet);

      expect(result).toEqual({
        merchantMetadata,
        merchantName: 'Merchant',
        merchantNameAr: 'التاجر',
        merchantLogo: 'https://logo.png',
        outletName: 'Outlet',
        outletNameAr: 'المتجر',
      });
    });

    it('falls back to merchantName when nameAr is null', async () => {
      const merchantMetadata = { name: 'Merchant', nameAr: null, imageUrl: null } as any;
      const outlet = { name: 'Outlet', nameAr: null } as Outlet;

      merchantService.getMerchantById.mockResolvedValue(merchantMetadata);

      const result = await service.getMerchantAndOutletNamesForCoreSync('m1', outlet);

      expect(result.merchantNameAr).toBe('Merchant');
      expect(result.outletNameAr).toBe('Outlet');
    });
  });

  describe('syncPoiOutletToCore', () => {
    it('calls updateCoreMerchantOutlet with null country and city', async () => {
      const outlet = { outletId: 'o1', name: 'Outlet', nameAr: 'Ar' } as Outlet;
      const data = {
        merchantId: 'm1',
        outletAddress: { location: 'Dubai' },
      } as any;
      const token = { Authorization: 'Bearer x' };

      merchantService.getMerchantById.mockResolvedValue({ name: 'M', nameAr: 'MA', imageUrl: 'logo', filters: [] });
      areaService.findById.mockResolvedValue(null);
      outletGetService.getOutletNo.mockResolvedValue({ outletNo: 'ON1' });
      coreMerchantOutletProxy.updateOutletInCore.mockResolvedValue({});

      await service.syncPoiOutletToCore(outlet, data, token);

      expect(coreMerchantOutletProxy.updateOutletInCore).toHaveBeenCalledWith(
        'o1',
        'm1',
        'M',
        'Outlet',
        'logo',
        undefined,
        undefined,
        undefined,
        null,
        undefined,
        undefined,
        'ON1',
        token,
        'Dubai',
        'MA',
        'Ar'
      );
    });
  });

  describe('syncCustomOutletToCore', () => {
    it('calls updateCoreMerchantOutlet with UAE and cityId', async () => {
      const outlet = { outletId: 'o1', name: 'Outlet', nameAr: null } as Outlet;
      const data = {
        merchantId: 'm1',
        outletAddress: { location: 'Dubai', cityId: 'city-1' },
      } as any;
      const token = {};

      merchantService.getMerchantById.mockResolvedValue({ name: 'M', nameAr: null, imageUrl: null, filters: [] });
      areaService.findById.mockResolvedValue({ dataValues: { city: 'Dubai' } });
      outletGetService.getOutletNo.mockResolvedValue({ outletNo: 'ON1' });
      coreMerchantOutletProxy.updateOutletInCore.mockResolvedValue({});

      await service.syncCustomOutletToCore(outlet, data, token);

      expect(coreMerchantOutletProxy.updateOutletInCore).toHaveBeenCalledWith(
        'o1',
        'm1',
        'M',
        'Outlet',
        null,
        undefined,
        undefined,
        undefined,
        'UAE',
        'Dubai',
        undefined,
        'ON1',
        token,
        'Dubai',
        'M',
        'Outlet'
      );
    });
  });

  describe('updateCoreMerchantOutlet', () => {
    it('passes category and area to core proxy', async () => {
      const merchantMetadata = {
        merchantNo: 'MN1',
        filters: [{ category: { imageUrl: 'cat.png', dataValues: { id: 'cat1' }, name: 'Food' } }],
      } as any;
      const token = {};
      areaService.findById.mockResolvedValue({ dataValues: { city: 'Dubai' } });
      outletGetService.getOutletNo.mockResolvedValue({ outletNo: 'ON1' });
      coreMerchantOutletProxy.updateOutletInCore.mockResolvedValue({});

      await service.updateCoreMerchantOutlet(
        merchantMetadata,
        'm1',
        'o1',
        'Merchant',
        'Outlet',
        'logo',
        'UAE',
        'city-1',
        token,
        'Dubai location',
        'MA',
        'OA'
      );

      expect(coreMerchantOutletProxy.updateOutletInCore).toHaveBeenCalledWith(
        'o1',
        'm1',
        'Merchant',
        'Outlet',
        'logo',
        'cat.png',
        'cat1',
        'Food',
        'UAE',
        'Dubai',
        'MN1',
        'ON1',
        token,
        'Dubai location',
        'MA',
        'OA'
      );
    });
  });
});
