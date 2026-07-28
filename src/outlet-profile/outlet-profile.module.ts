import { SequelizeModule } from '@nestjs/sequelize';
import { OutletProfileService } from './services/outlet-profile.service';
import { forwardRef, Module } from '@nestjs/common';
import { OutletProfileMetadata } from './entities/outlet-profile.model';
import { OutletProfileFilters } from './entities/outlet-profile-filters';
import { OutletProfilePhotos } from './entities/outlet-profile-photos';
import { OutletProfileController } from './controllers/outlet-profile.controller';
import { MerchantProfileModule } from 'src/merchant-profile/merchant-profile.module';
import { OutletOfferProxy } from 'src/outlet/proxies/outlet-offer.proxy';
import { OutletProfileFilterService } from './services/outlet-profile-filter.service';
import { OutletProducer } from 'src/kafka-services/outlet.producer';
import { KafkaProducerService } from 'src/kafka-producer/kafka-producer.service';
import { OutletModule } from 'src/outlet/outlet.module';
import { OutletProfilePhotosController } from './controllers/outlet-profile-photos.controller';
import { OutletProfilePhotosService } from './services/outlet-profile-photos.service';
import { Outlet } from 'src/outlet/models/outlet.model';
import { MerchantModule } from 'src/merchant/merchant.module';
import { FastPaymentServiceProxy } from 'src/outlet/proxies/fast-payment-service.proxy';
import { PosServiceProxy } from 'src/outlet/proxies/pos-service.proxy';
import { SchemeServiceProxy } from 'src/outlet/proxies/scheme-service.proxy';
import { MastercardSchemeServiceProxy } from 'src/outlet/proxies/mc-scheme-service.proxy';
import { MoEngageProxy } from 'src/outlet/proxies/moengage.proxy';
import { FinanceServiceProxy } from 'src/outlet/proxies/finance-service.proxy';
import { DataOperationsProducer } from 'src/kafka-services/data-operations.producer';
import { CustomLoggerModule } from 'src/logger/logger.module';
import { OutletProfileValidationStatusService } from './services/outlet-profile-validation-status.service';

@Module({
  controllers: [OutletProfileController, OutletProfilePhotosController],
  imports: [
    SequelizeModule.forFeature([OutletProfileMetadata, OutletProfileFilters, OutletProfilePhotos, Outlet]),
    forwardRef(() => MerchantProfileModule),
    forwardRef(() => OutletModule),
    forwardRef(() => MerchantModule),
    CustomLoggerModule,
  ],
  exports: [OutletProfileService, OutletProfileFilterService],
  providers: [
    OutletProfileValidationStatusService,
    OutletProfileService,
    OutletOfferProxy,
    OutletProfileFilterService,
    OutletProducer,
    KafkaProducerService,
    FastPaymentServiceProxy,
    PosServiceProxy,
    OutletProfilePhotosService,
    SchemeServiceProxy,
    MastercardSchemeServiceProxy,
    MoEngageProxy,
    FinanceServiceProxy,
    DataOperationsProducer,
  ],
})
export class OutletProfileModule {}
