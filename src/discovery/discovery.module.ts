import { Module } from '@nestjs/common';
import { DiscoveryCityController } from './discovery-city.controller';
import { DiscoveryOutletController } from './discovery-outlet.controller';
import { AreaModule } from 'src/area/area.module';
import { OutletModule } from 'src/outlet/outlet.module';
import { FavoriteOutletModule } from 'src/favorite-outlet/favorite-outlet.module';
import { SequelizeModule } from '@nestjs/sequelize';
import { FavoriteOutlet } from 'src/favorite-outlet/models/favorite-outlet.model';
import { DiscoveryService } from './services/discovery.service';
import { DiscoveryListingService } from './services/discovery-listing.service';
import { DiscoveryDetailsService } from './services/discovery-details.service';
import { Outlet } from 'src/outlet/models/outlet.model';
import { DistanceService } from 'src/distance/services/distance.service';
import { FilterService } from 'src/filters/services/filter.service';
import { OutletFilterService } from 'src/outlet/services/outlet-filters.service';
import { OutletFilters } from 'src/outlet/models/outlet-filters.model';
import { Category } from 'src/category/models/category.model';
import { SubCategory } from 'src/sub-category/models/sub-category.model';
import { Filter } from 'src/filters/models/filter.model';
import { CategoryModule } from 'src/category/category.module';
import { SubCategoryModule } from 'src/sub-category/sub-category.module';
import { FiltersModule } from 'src/filters/filters.module';
import { OutletOfferProxy } from 'src/outlet/proxies/outlet-offer.proxy';
import { OutletAddress } from 'src/outlet/models/outlet-address.model';
import { OutletProducer } from 'src/kafka-services/outlet.producer';
import { KafkaProducerService } from 'src/kafka-producer/kafka-producer.service';
import { GooglePlacesModule } from 'src/google-places/places.module';
import { OutletProfileModule } from 'src/outlet-profile/outlet-profile.module';
import { OutletProfileMetadata } from 'src/outlet-profile/entities/outlet-profile.model';
import { CustomLoggerModule } from 'src/logger/logger.module';

@Module({
  controllers: [DiscoveryCityController, DiscoveryOutletController],
  providers: [
    DiscoveryService,
    DiscoveryListingService,
    DiscoveryDetailsService,
    OutletFilterService,
    FilterService,
    DistanceService,
    OutletOfferProxy,
    OutletProducer,
    KafkaProducerService,
  ],
  imports: [
    AreaModule,
    OutletModule,
    FavoriteOutletModule,
    CategoryModule,
    SubCategoryModule,
    FiltersModule,
    SequelizeModule.forFeature([
      FavoriteOutlet,
      Outlet,
      OutletFilters,
      Category,
      SubCategory,
      Filter,
      OutletAddress,
      OutletProfileMetadata,
    ]),
    GooglePlacesModule,
    OutletProfileModule,
    CustomLoggerModule,
  ],
  exports: [OutletProducer, KafkaProducerService],
})
export class DiscoveryModule {}
