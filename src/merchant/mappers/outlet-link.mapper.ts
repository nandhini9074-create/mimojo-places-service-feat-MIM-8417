import { Outlet } from "src/outlet/models/outlet.model";


export const linkedOutletsMapper = (outletLinks: {outletId: string, merchantId: string}[], outlets: Partial<Outlet>[]) => {

  const linkedOutlets = outletLinks.map((outletLink) => {
    const thisOutlet = outlets?.find(outlet => outlet?.outletId === outletLink?.outletId);

    if (!thisOutlet) return null;

    const thisLink = {
      outletId: outletLink.outletId,
      merchantId: outletLink.merchantId,
      merchantName: thisOutlet.merchantName,
      outletName: thisOutlet.name
    };

    return thisLink;
  }).filter(link => link !== null);

  return linkedOutlets;

};