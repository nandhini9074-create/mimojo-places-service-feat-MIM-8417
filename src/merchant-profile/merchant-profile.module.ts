import { forwardRef, Module } from '@nestjs/common';
import { MerchantProfileController } from './controllers/merchant-profile.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { MerchantProfileService } from './services/merchant-profile.service';
import { Merchant } from 'src/merchant/entities/merchant.model';
import { MerchantProfileMetadata } from './entities/merchant-profile-metadata.model';
import { Profile } from 'src/outlet/models/profile.model';
import { MerchantProfilePhoto } from './entities/merchant-profile-photo.entity';
import { MerchantProfileFiltersModule } from 'src/merchant-profile-filters/merchant-profile-filters.module';
import { OutletAddress } from 'src/outlet/models/outlet-address.model';
import { OutletProfileModule } from 'src/outlet-profile/outlet-profile.module';
import { OutletProfileMetadata } from 'src/outlet-profile/entities/outlet-profile.model';
import { DistanceService } from 'src/distance/services/distance.service';
import { MerchantModule } from 'src/merchant/merchant.module';
import { CustomLoggerModule } from 'src/logger/logger.module';
import { OutletProfileMapping } from 'src/outlet/models/outlet-profile-mapping.model';
import { OutletModule } from 'src/outlet/outlet.module';
import { Outlet } from 'src/outlet/models/outlet.model';

@Module({
  controllers: [MerchantProfileController],
  imports: [
    SequelizeModule.forFeature([
      MerchantProfileMetadata,
      Merchant,
      Profile,
      MerchantProfilePhoto,
      OutletProfileMetadata,
      OutletAddress,
      OutletProfileMapping,
      Outlet,
    ]),
    MerchantProfileFiltersModule,
    forwardRef(() => OutletProfileModule),
    forwardRef(() => OutletModule),
    MerchantModule,
    CustomLoggerModule,
  ],
  providers: [MerchantProfileService, DistanceService],
  exports: [MerchantProfileService],
})
export class MerchantProfileModule {}
