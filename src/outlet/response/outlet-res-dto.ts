import { OutletAddress } from "../models/outlet-address.model";
import { OutletPhoto } from "../models/outlet-photo.model";
import { OutletTiming } from "../models/outlet-timing.model";
import { Outlet } from "../models/outlet.model";

export type OutletResponse = {
    outlet: Outlet;
    outletAddress: OutletAddress;
    outletPhotos: OutletPhoto[];
    outletTiming: OutletTiming;
};
