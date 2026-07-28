import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { SequelizeModule } from '@nestjs/sequelize';
import { validate } from 'env.validation';
import {
  appConfig,
  databaseConfig,
  grafanaCredentials,
  googlePlacesConfig,
  internalApisConfig,
  kafkaConsumerConfig,
  kafkaMessageConsumerConfig,
} from '../config/server.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AreaModule } from './area/area.module';
import SequelizeHooksHandler from './common/helpers/sequelize-hooks';
import { DiscoveryModule } from './discovery/discovery.module';
import { DistanceModule } from './distance/distance.module';
import { AllExceptionsFilter } from './errors/catch-all-errors';
import { GooglePlacesModule } from './google-places/places.module';
import { databaseBuilder } from './helpers/database';
import { KafkaProducerService } from './kafka-producer/kafka-producer.service';
import { DataOperationsProducer } from './kafka-services/data-operations.producer';
import { OutletModule } from './outlet/outlet.module';
import { SeederModule } from './seeder/seeder.module';
import { KafkaConsumerModule } from './kafka-consumer/kafka.module';
import { CategoryModule } from './category/category.module';
import { SubCategoryModule } from './sub-category/sub-category.module';
import { CountryModule } from './countries/country.module';
import { MerchantFiltersModule } from './merchant-filters/merchant-filters.module';
import { FiltersModule } from './filters/filters.module';
import { MerchantConfigurationModule } from './merchant-configuration/merchant-configuration.module';
import { MerchantModule } from './merchant/merchant.module';
import { GroupModule } from './groups/groups.module';
import { MerchantProfileModule } from './merchant-profile/merchant-profile.module';
import { OutletProfileModule } from './outlet-profile/outlet-profile.module';
import { ProxyModule } from './proxy/proxy.module';
import { LoggerModule, PinoLogger } from 'nestjs-pino';
import { PINO_LOGGER_OPTIONS_TOKEN, PinoLoggerInterceptor } from './logger/logger.interceptor';
import { CustomLoggerModule } from './logger/logger.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerModule as CronModuleV2 } from './scheduler/schedule.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [
        internalApisConfig,
        appConfig,
        databaseConfig,
        kafkaConsumerConfig,
        kafkaMessageConsumerConfig,
        googlePlacesConfig,
        grafanaCredentials,
      ],
      cache: true,
      isGlobal: true,
      validate,
    }),
    SequelizeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          ...databaseBuilder(config),
          hooks: new SequelizeHooksHandler(new DataOperationsProducer(new KafkaProducerService(config), config)).getHooks(),
        };
      },
    }),
    ProxyModule,
    OutletModule,
    DistanceModule,
    GooglePlacesModule,
    AreaModule,
    DiscoveryModule,
    SeederModule,
    KafkaConsumerModule,
    CategoryModule,
    SubCategoryModule,
    CountryModule,
    MerchantFiltersModule,
    FiltersModule,
    MerchantConfigurationModule,
    MerchantModule,
    GroupModule,
    MerchantProfileModule,
    OutletProfileModule,
    LoggerModule.forRoot(),
    CustomLoggerModule,
    ScheduleModule.forRoot(),
    CronModuleV2,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PinoLogger,
    {
      provide: PINO_LOGGER_OPTIONS_TOKEN,
      useValue: {
        logRequests: true,
        logResponseBody: true,
      },
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: PinoLoggerInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
