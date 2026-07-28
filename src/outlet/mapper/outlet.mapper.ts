import { getNextCopyName } from 'src/common/helpers/copy-name.helper';
import { OutletFastPaymentStatusEnum, OutletStatusEnum } from '../enums/outlet-status-enum';
import { Outlet } from '../models/outlet.model';

export function createOutletMapper(originalOutlet: Outlet, userId: string) {
  return {
    merchantId: originalOutlet.merchantId,
    name: getNextCopyName(originalOutlet.name),
    rating: originalOutlet.rating,
    priceLevel: originalOutlet.priceLevel,
    website: originalOutlet.website,
    formattedPhoneNumber: originalOutlet.formattedPhoneNumber,
    businessStatus: originalOutlet.businessStatus,
    userRatingsTotal: originalOutlet.userRatingsTotal,
    status: OutletStatusEnum.Pending,
    description: originalOutlet.description,
    source: originalOutlet.source,
    menuUrl: originalOutlet.menuUrl,
    bookingUrl: originalOutlet.bookingUrl,
    merchantLogoUrl: originalOutlet.merchantLogoUrl,
    maxOffer: originalOutlet.maxOffer,
    outletNo: originalOutlet.outletNo,
    hasCustomOffer: originalOutlet.hasCustomOffer,
    fastPaymentStatus:
      originalOutlet.fastPaymentStatus === 'NOT ENROLLED'
        ? OutletFastPaymentStatusEnum['NOT ENROLLED']
        : OutletFastPaymentStatusEnum.PENDING,
    updatedBy: userId,
    nameAr: getNextCopyName(originalOutlet?.nameAr ?? originalOutlet.name),
    merchantName: originalOutlet.merchantName,
    merchantNameAr: originalOutlet.merchantNameAr,
    menuUrlAr: originalOutlet.menuUrlAr,
    bookingUrlAr: originalOutlet.bookingUrlAr,
    websiteAr: originalOutlet.websiteAr,
    descriptionAr: originalOutlet.descriptionAr,
    artDesc: originalOutlet.artDesc,
    competitorDesc: originalOutlet.competitorDesc,
    hasClone: false,
    // offerDescription: originalOutlet.offerDescription
  };
}
