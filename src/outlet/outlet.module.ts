import { forwardRef, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Area } from 'src/area/models/area.model';
import { AreaService } from 'src/area/services/area.service';
import { CategoryModule } from 'src/category/category.module';
import { Category } from 'src/category/models/category.model';
import { DistanceModule } from 'src/distance/distance.module';
import { FiltersModule } from 'src/filters/filters.module';
import { Filter } from 'src/filters/models/filter.model';
import { FilterService } from 'src/filters/services/filter.service';
import { ImageModule } from 'src/images/images.model';
import { DataOperationsProducer } from 'src/kafka-services/data-operations.producer';
import { OutletProducer } from 'src/kafka-services/outlet.producer';
import { Neighbourhood } from 'src/neighbourhood/models/neighbourhood.model';
import { OutletFilters } from 'src/outlet/models/outlet-filters.model';
import { OutletController } from 'src/outlet/outlet.controller';
import { OutletFilterService } from 'src/outlet/services/outlet-filters.service';
import { SubCategory } from 'src/sub-category/models/sub-category.model';
import { SubCategoryService } from 'src/sub-category/services/sub-category.service';
import { SubCategoryModule } from 'src/sub-category/sub-category.module';
import { OutletKafkaProducerService } from '../images/services/outlet-kafka-producer.service';
import { OutletAddress } from './models/outlet-address.model';
import { OutletPhoto } from './models/outlet-photo.model';
import { OutletProfileMapping } from './models/outlet-profile-mapping.model';
import { OutletTiming } from './models/outlet-timing.model';
import { Outlet } from './models/outlet.model';
import { Profile } from './models/profile.model';
import { CoreMerchantOutletProxy } from './proxies/core-merchant-outlet.proxy';
import { FastPaymentServiceProxy } from './proxies/fast-payment-service.proxy';
import { FinanceServiceProxy } from './proxies/finance-service.proxy';
import { MastercardSchemeServiceProxy } from './proxies/mc-scheme-service.proxy';
import { MerchantGroupProxy } from './proxies/merchant-group.proxy';
import { MerchantMetadataProxy } from './proxies/merchant-metadata.proxy';
import { MoEngageProxy } from './proxies/moengage.proxy';
import { OutletOfferProxy } from './proxies/outlet-offer.proxy';
import { PosServiceProxy } from './proxies/pos-service.proxy';
import { SchemeServiceProxy } from './proxies/scheme-service.proxy';
import { OutletAddressService } from './services/outlet-address.service';
import { OutletGetService } from './services/outlet-get.service';
import { OutletHelperService } from './services/outlet-helper.service';
import { OutletMigrationService } from './services/outlet-migration.service';
import { OutletPhotoService } from './services/outlet-photo.service';
import { OutletProfileMappingService } from './services/outlet-profile-mapping.service';
import { OutletTimingService } from './services/outlet-timing.service';
import { OutletAuditFinanceService } from './services/outlet-audit-finance.service';
import { OutletCoreSyncService } from './services/outlet-core-sync.service';
import { OutletCustomCrudService } from './services/outlet-custom-crud.service';
import { OutletStatusService } from './services/outlet-status.service';
import { OutletService } from './services/outlet.service';
import { ProfileService } from './services/profile.service';
import { MerchantFilter } from 'src/merchant-filters/entities/merchant-filters.model';
import { MerchantModule } from 'src/merchant/merchant.module';
import { MerchantProfileMetadata } from 'src/merchant-profile/entities/merchant-profile-metadata.model';
import { ProfileController } from './profile.controller';
import { OutletProfileMetadata } from 'src/outlet-profile/entities/outlet-profile.model';
import { OutletProfileModule } from 'src/outlet-profile/outlet-profile.module';
import { SearchServiceProxy } from './proxies/search-service.proxy';
import { GooglePlacesModule } from 'src/google-places/places.module';
import { CustomLoggerModule } from 'src/logger/logger.module';
import { RewardEngineWrapperProxy } from './proxies/reward-engine-wrapper.proxy';
import { PayoutConfigurationProxy } from './proxies/payout-configuration.proxy';

@Module({
  controllers: [OutletController, ProfileController],
  providers: [
    SubCategoryService,
    FilterService,
    OutletFilterService,
    OutletAuditFinanceService,
    OutletCoreSyncService,
    OutletCustomCrudService,
    OutletStatusService,
    OutletService,
    OutletAddressService,
    OutletPhotoService,
    OutletTimingService,
    OutletKafkaProducerService,
    OutletGetService,
    OutletHelperService,
    MerchantMetadataProxy,
    OutletOfferProxy,
    CoreMerchantOutletProxy,
    SchemeServiceProxy,
    AreaService,
    MoEngageProxy,
    FinanceServiceProxy,
    FastPaymentServiceProxy,
    PosServiceProxy,
    MerchantGroupProxy,
    MastercardSchemeServiceProxy,
    OutletMigrationService,
    DataOperationsProducer,
    OutletProducer,
    OutletProfileMappingService,
    ProfileService,
    SearchServiceProxy,
    RewardEngineWrapperProxy,
    PayoutConfigurationProxy,
  ],
  imports: [
    DistanceModule,
    CategoryModule,
    SubCategoryModule,
    FiltersModule,
    ImageModule,
    OutletModule,
    forwardRef(() => MerchantModule),
    OutletProfileModule,
    SequelizeModule.forFeature([
      Profile,
      Category,
      SubCategory,
      Filter,
      OutletFilters,
      Outlet,
      OutletAddress,
      OutletPhoto,
      OutletTiming,
      Area,
      Neighbourhood,
      OutletProfileMapping,
      MerchantFilter,
      OutletProfileMetadata,
      MerchantProfileMetadata,
    ]),
    GooglePlacesModule,
    CategoryModule,
    CustomLoggerModule,
  ],
  exports: [
    OutletService,
    OutletProfileMappingService,
    OutletGetService,
    OutletProducer,
    OutletAddressService,
    OutletPhotoService,
    SearchServiceProxy,
    ProfileService,
    RewardEngineWrapperProxy,
    PayoutConfigurationProxy,
  ],
})
export class OutletModule {}
