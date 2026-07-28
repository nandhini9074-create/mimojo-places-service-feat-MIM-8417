import { RedemptionChannel } from '../enums/outlet-status-enum';

interface OutletPayloadInput {
  website?: string;
  formattedPhoneNumber?: string;
  outletAddress?: {
    latitude?: number | string;
    longitude?: number | string;
    location?: string;
    neighbourhood?: {
      area?: { areaName?: string };
      neighbourhoodName?: string;
    };
  };
  merchant?: {
    merchantProfiles?: {
      imageUrl?: string;
      filters?: { category?: { name?: string }; subCategory?: { name?: string } }[];
      merchantProfilePhotos?: { cdnUrl?: string }[];
    }[];
  };
  profileOutlets?: {
    outletId?: string;
    merchantName?: string;
    name?: string;
    maxOffer?: string | number;
    hasCustomOffer?: string | boolean;
  }[];
  categoryNames?: string;
  subCategoryNames?: string;
  [key: string]: unknown;
}

export function mainFilePayloadMapper(outlet: OutletPayloadInput) {
  const areaName = outlet.outletAddress?.neighbourhood?.area?.areaName;
  let redemptionChannel: RedemptionChannel | '' = '';
  if (areaName === 'www') {
    redemptionChannel = RedemptionChannel.ONLINE;
  } else if (areaName) {
    redemptionChannel = RedemptionChannel.INSTORE;
  }

  const names = Array.from(
    new Set(
      (outlet.merchant?.merchantProfiles?.[0]?.filters ?? [])
        .map(f => f?.category?.name)
        .map(name => (typeof name === 'string' ? name.trim() : ''))
        .filter(name => name !== '')
    )
  );
  const subCategoryNames = Array.from(
    new Set(
      (outlet.merchant?.merchantProfiles?.[0]?.filters ?? [])
        .map(f => f?.subCategory?.name)
        .map(name => (typeof name === 'string' ? name.trim() : ''))
        .filter(name => name !== '')
    )
  );

  outlet.categoryNames = names.join(', ');
  if (subCategoryNames.length === 0) {
    outlet.subCategoryNames = '';
  } else if (subCategoryNames.length === 1) {
    outlet.subCategoryNames = subCategoryNames[0];
  } else if (subCategoryNames.length === 2) {
    outlet.subCategoryNames = subCategoryNames.join(' and ');
  } else {
    outlet.subCategoryNames =
      subCategoryNames.slice(0, -1).join(', ') + ' and ' + subCategoryNames[subCategoryNames.length - 1];
  }

  const result = {
    website: outlet.website,
    phoneNumber: outlet.formattedPhoneNumber,
    geoPoints: `${outlet.outletAddress?.latitude ?? '-'},${outlet.outletAddress?.longitude ?? '-'}`,
    city: outlet.outletAddress?.neighbourhood?.area?.areaName ?? '',
    locationName: [
      outlet.outletAddress?.neighbourhood?.area?.areaName,
      outlet.outletAddress?.neighbourhood?.neighbourhoodName,
    ]
      .filter(Boolean)
      .join(' '),
    outletId: outlet.profileOutlets?.[0]?.outletId ?? '',
    merchantName: outlet.profileOutlets?.[0]?.merchantName ?? '',
    outletName: outlet.profileOutlets?.[0]?.name ?? '',
    maxOffer: outlet.profileOutlets?.[0]?.maxOffer ?? '',
    hasCustomOffer: outlet.profileOutlets?.[0]?.hasCustomOffer ?? '',
    logo: outlet.merchant?.merchantProfiles?.[0]?.imageUrl ?? '',
    listingImage: outlet.merchant?.merchantProfiles?.[0]?.merchantProfilePhotos?.[0]?.cdnUrl ?? '',
    heroImage: outlet.merchant?.merchantProfiles?.[0]?.merchantProfilePhotos?.[1]?.cdnUrl ?? '',
    mobileHeroImage: outlet.merchant?.merchantProfiles?.[0]?.merchantProfilePhotos?.[2]?.cdnUrl ?? '',
    category: outlet.categoryNames,
    subCategory: outlet.subCategoryNames,
    outletLocationName: outlet?.outletAddress?.location ?? '',
    redemptionChannel: redemptionChannel,
  };

  return result;
}
