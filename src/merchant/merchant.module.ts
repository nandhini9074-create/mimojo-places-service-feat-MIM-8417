import { Module, forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Merchant } from './entities/merchant.model';
import { MerchantService } from './services/merchant.service';
import { MerchantReadController } from './controllers/merchant-read.controller';
import { MerchantWriteController } from './controllers/merchant-write.controller';
// import { UsersModule } from '../users/users.module';
// import { AuthModule } from '../auth/auth.module';
// import { RoleModule } from '../users/role/role.module';
// import { MailModule } from '../mail/mail.module';
import { CategoryModule } from 'src/category/category.module';
import { SubCategoryModule } from 'src/sub-category/sub-category.module';
import { FiltersModule } from '../filters/filters.module';
// import { SharedModule } from 'src/shared/shared.module';
import { GenericHttpModule } from 'src/http/http.module';
import { MerchantFiltersModule } from '../merchant-filters/merchant-filters.module';
import { GroupModule } from '../groups/groups.module';
// import { User } from 'src/users/entities/user.model';
import { GroupMerchantService } from './shared/group-merchant.service';
// // import { Outlet } from './entities/outlet.model';
import { MerchantConfigurationModule } from 'src/merchant-configuration/merchant-configuration.module';
// import { KafkaModule } from 'src/kafka/kafka.module';
import { DataOperationsProducer } from 'src/kafka-services/data-operations.producer';
import { KafkaProducerService } from 'src/kafka-producer/kafka-producer.service';
import { OutletModule } from 'src/outlet/outlet.module';
import { OfferServiceProducer } from 'src/kafka-services/offer-service.producer';
import { PaymentServiceProducer } from 'src/kafka-services/payment-service.producer';
import { Outlet } from 'src/outlet/models/outlet.model';
import { MerchantPhoto } from './entities/merchant-photo.model';
import { MerchantPhotoService } from './services/merchant-photo.service';
import { MerchantProfileMetadata } from 'src/merchant-profile/entities/merchant-profile-metadata.model';
import { MerchantIdentityProxy } from 'src/proxy/services/merchant-identity.proxy';
import { CustomLoggerModule } from 'src/logger/logger.module';
import { ProxyModule } from 'src/proxy/proxy.module';
import { MerchantCrmService } from './services/merchant-crm.service';

@Module({
  controllers: [MerchantReadController, MerchantWriteController],
  providers: [
    MerchantService,
    MerchantCrmService,
    GroupMerchantService,
    DataOperationsProducer,
    KafkaProducerService,
    OfferServiceProducer,
    PaymentServiceProducer,
    MerchantPhotoService,
    MerchantIdentityProxy,
  ],
  imports: [
    SequelizeModule.forFeature([Merchant, Outlet, MerchantPhoto, MerchantProfileMetadata]),
    // UsersModule,
    // forwardRef(() => AuthModule),
    // SharedModule,
    CategoryModule,
    SubCategoryModule,
    FiltersModule,
    // RoleModule,
    // MailModule,
    forwardRef(() => OutletModule),
    GenericHttpModule,
    MerchantFiltersModule,
    GroupModule,
    MerchantConfigurationModule,
    CustomLoggerModule,
    // KafkaModule
    // KafkaModule,
    ProxyModule,
  ],
  exports: [MerchantService, MerchantPhotoService],
})
export class MerchantModule {}
