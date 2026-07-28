import { HttpException } from '@nestjs/common';
import { HttpStatusCode } from 'axios';
import { EnvKeysEnum } from 'config/env.enum';
import { OutletAddress } from '../models/outlet-address.model';

export function validateOutletAddressOrThrow(outletAddress: OutletAddress, outletName: string | null | undefined) {
  if (outletAddress?.areaId == null || outletAddress?.neighbourhoodId == null) {
    throw new HttpException('Please select City & Neighbourhood!', HttpStatusCode.BadRequest);
  }
  if (
    outletAddress.areaId != process.env[EnvKeysEnum.E_COMMERCE_AREA_ID] &&
    (outletAddress?.latitude == null || outletAddress?.longitude == null)
  ) {
    throw new HttpException('Please enter latitude & longitude!', HttpStatusCode.BadRequest);
  }
  if (outletAddress?.location == null || outletName == null) {
    throw new HttpException('Please enter outlet name!', HttpStatusCode.BadRequest);
  }
}
