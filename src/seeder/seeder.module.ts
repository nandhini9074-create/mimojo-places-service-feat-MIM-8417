import { Module } from '@nestjs/common';
import { SeederController } from './seeder.controller';
import { SeederService } from './seeder.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { OutletProfileMapping } from 'src/outlet/models/outlet-profile-mapping.model';
import { Profile } from 'src/outlet/models/profile.model';
import { Merchant } from 'src/merchant/entities/merchant.model';
import { SEEDER_MERCHANT_PROFILE_MODELS } from './seeder-models';
import { MerchantProfileFilter } from 'src/merchant-profile-filters/entities/merchant-profile-filters.model';
import { Filter } from 'src/filters/models/filter.model';
import { Outlet } from 'src/outlet/models/outlet.model';
import { OutletProfileMetadata } from 'src/outlet-profile/entities/outlet-profile.model';
import { OutletProfileFilters } from 'src/outlet-profile/entities/outlet-profile-filters';
import { OutletProfilePhotos } from 'src/outlet-profile/entities/outlet-profile-photos';
import { OutletPhoto } from 'src/outlet/models/outlet-photo.model';
import { OutletFilters } from 'src/outlet/models/outlet-filters.model';
import { SubCategory } from 'src/sub-category/models/sub-category.model';
import { OutletProfileModule } from 'src/outlet-profile/outlet-profile.module';
import { CustomLoggerModule } from 'src/logger/logger.module';
import { OutletModule } from 'src/outlet/outlet.module';
import { Area } from 'src/area/models/area.model';
import { Neighbourhood } from 'src/neighbourhood/models/neighbourhood.model';
import { Category } from 'src/category/models/category.model';
import { SeederImageService } from './services/seeder-image.service';
import { SeederNeighbourhoodService } from './services/seeder-neighbourhood.service';
import { SeederCategoryService } from './services/seeder-category.service';
import { SeederIdentityMigrationService } from './services/seeder-identity-migration.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Profile,
      OutletProfileMapping,
      Merchant,
      ...SEEDER_MERCHANT_PROFILE_MODELS,
      MerchantProfileFilter,
      Filter,
      Outlet,
      OutletProfileMetadata,
      OutletFilters,
      OutletProfileFilters,
      OutletPhoto,
      OutletProfilePhotos,
      SubCategory,
      Area,
      Neighbourhood,
      Category,
    ]),
    OutletProfileModule,
    CustomLoggerModule,
    OutletModule,
  ],
  controllers: [SeederController],
  providers: [
    SeederImageService,
    SeederNeighbourhoodService,
    SeederCategoryService,
    SeederIdentityMigrationService,
    SeederService,
  ],
})
export class SeederModule {}
