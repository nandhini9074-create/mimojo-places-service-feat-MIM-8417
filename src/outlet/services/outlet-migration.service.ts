import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Outlet } from '../models/outlet.model';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { IInternalApiConfig } from 'config/interface';

@Injectable()
export class OutletMigrationService {
  private outletOffer: string;

  constructor(
    @InjectModel(Outlet)
    private readonly outletModel: typeof Outlet,
    private readonly configService: ConfigService
  ) {
    const { OUTLET_OFFER } = this.configService.get<IInternalApiConfig>('internal-apis');
    this.outletOffer = OUTLET_OFFER;
  }
  public async migrateOffer(token: Record<string, string>, userId: string) {
    const outlets = await this.outletModel.findAll({ where: { status: 'Active' } });
    for (const outlet of outlets) {
      try {
        const config = {
          headers: {
            'Authorization': token.authorization,
            'x-device-id': token['x-device-id'],
          },
        };
        const offer = await axios.get(this.outletOffer.replace(':outletId', outlet.outletId), config); // Need to check
        const hasCustomHours =
          offer?.data?.data?.outletCustomHours.length > 0 || offer?.data?.data?.outletBlackOutdays.length > 0;
        await this.outletModel.update(
          {
            hasCustomOffer: hasCustomHours,
            updatedBy: userId,
          },
          {
            where: {
              outletId: outlet?.outletId,
            },
          }
        );
      } catch (ex) {
        console.log(ex);
        console.log('outlet', outlet);
      }
    }
    return { status: 'success' };
  }
}
