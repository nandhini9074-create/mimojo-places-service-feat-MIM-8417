import { createOutletMapper } from './outlet.mapper';
import { OutletStatusEnum } from '../enums/outlet-status-enum';
import { OutletFastPaymentStatusEnum } from '../enums/outlet-status-enum';
import { Outlet } from '../models/outlet.model';

describe('outlet.mapper', () => {
  const baseOutlet = {
    outletId: 'outlet-1',
    merchantId: 'merchant-1',
    name: 'KFC',
    nameAr: 'كنتاكي',
    rating: 4,
    priceLevel: 1,
    website: null,
    formattedPhoneNumber: null,
    businessStatus: null,
    userRatingsTotal: null,
    status: OutletStatusEnum.Pending,
    description: null,
    source: null,
    menuUrl: null,
    bookingUrl: null,
    merchantLogoUrl: null,
    maxOffer: 10,
    outletNo: 1,
    hasCustomOffer: false,
    fastPaymentStatus: OutletFastPaymentStatusEnum.PENDING,
    merchantName: null,
    merchantNameAr: null,
    menuUrlAr: null,
    bookingUrlAr: null,
    websiteAr: null,
    descriptionAr: null,
    artDesc: null,
    competitorDesc: null,
    hasClone: false,
  } as unknown as Outlet;

  describe('createOutletMapper', () => {
    it('should set name and nameAr to "X copy (1)" when cloning from plain name', () => {
      const result = createOutletMapper(baseOutlet, 'user-1');
      expect(result.name).toBe('KFC copy (1)');
      expect(result.nameAr).toBe('كنتاكي copy (1)');
    });

    it('should set name to "X copy (2)" when cloning from "X copy (1)"', () => {
      const result = createOutletMapper(
        { ...baseOutlet, name: 'KFC copy (1)', nameAr: 'كنتاكي copy (1)' } as Outlet,
        'user-1'
      );
      expect(result.name).toBe('KFC copy (2)');
      expect(result.nameAr).toBe('كنتاكي copy (2)');
    });

    it('should pass through other outlet fields and set status to Pending and hasClone to false', () => {
      const result = createOutletMapper(baseOutlet, 'user-1');
      expect(result.merchantId).toBe('merchant-1');
      expect(result.rating).toBe(4);
      expect(result.status).toBe(OutletStatusEnum.Pending);
      expect(result.fastPaymentStatus).toBe(OutletFastPaymentStatusEnum.PENDING);
      expect(result.hasClone).toBe(false);
      expect(result.updatedBy).toBe('user-1');
    });
  });
});
