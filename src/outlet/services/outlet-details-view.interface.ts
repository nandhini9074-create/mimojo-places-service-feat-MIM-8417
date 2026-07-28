export interface OutletDetailsView {
  id?: string;
  outletId?: string;
  name?: string | null;
  outletNo: string;
  merchantId?: string;
  merchantName?: string;
  outletPhotos: Array<{ isDefault?: boolean; cdnUrl?: string }>;
  outletFilters?: Array<{
    filter?: {
      category?: { id?: string; imageUrl?: string; name?: string };
      subCategory?: { id?: string };
    };
  }> | null;
  outletNormalOffer?: unknown;
  outletCustomHours?: unknown[];
  outletTieredOffers?: unknown;
  offer?: { rules?: unknown[] };
  outletProfileMetadata?: { profileId?: string };
}
