export type GetOutletResponse = {
  outletId: number;
  merchantName: string;
  rating: number;
  distanceInKm: string;
  price: number;
  defaultPhoto: string;
  discount: number;
  location: string;
  type: string[];
  cuisine: string[];
  hasCustomOffer?: boolean;
  categoryIcon?: string[];
};
