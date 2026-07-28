import { Outlet } from 'src/outlet/models/outlet.model';

export const outletDiscoveryCategoryIconMapper = (outlet: Outlet) => {
  const isVirtualAddress = !!outlet?.outletAddress?.neighbourhood?.area?.isVirtual;
  const categoryIcon = [];

  const categoryFilter =
    outlet?.outletFilters?.find(filter => {
      if (isVirtualAddress) {
        if (filter?.filter?.category?.isVirtual) {
          return true;
        }
      } else {
        if (filter?.filter?.category?.isVirtual === false) {
          return true;
        }
      }
    }) ?? (outlet?.outletFilters ? outlet?.outletFilters[0] : null);

  const firstCategory = categoryFilter?.filter?.category ?? null;

  if (firstCategory?.imageUrl) {
    const categoryIconObj = {
      imageUrl: firstCategory.imageUrl,
      darkImageUrl: firstCategory.darkImageUrl,
      isAnimated: firstCategory.isAnimated,
    };
    categoryIcon.push(categoryIconObj);
  }

  return categoryIcon;
};
