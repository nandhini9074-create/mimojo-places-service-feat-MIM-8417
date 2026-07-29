import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ImagesController } from './images.controller';
import { UploadOutletImageProxy } from './proxies/outlet-image-upload.proxy';
import { LlmImageOptimizationProxy } from './proxies/llm-image-optimization.proxy';
import { KafkaProducerService } from 'src/kafka-producer/kafka-producer.service';
import { OutletPhotoService } from 'src/outlet/services/outlet-photo.service';
import { OutletPhoto } from 'src/outlet/models/outlet-photo.model';
import { Outlet } from 'src/outlet/models/outlet.model';
import { OutletProfileMetadata } from 'src/outlet-profile/entities/outlet-profile.model';
import { OutletKafkaProducerService } from './services/outlet-kafka-producer.service';
import { ConfigModule } from '@nestjs/config';
import { blobConfig } from 'config/server.config';
import { DataOperationsProducer } from 'src/kafka-services/data-operations.producer';
import { CustomLoggerModule } from 'src/logger/logger.module';

@Module({
  controllers: [ImagesController],
  providers: [
    KafkaProducerService,
    OutletPhotoService,
    UploadOutletImageProxy,
    OutletKafkaProducerService,
    DataOperationsProducer,
    LlmImageOptimizationProxy,
  ],
  imports: [
    ConfigModule.forRoot({
      load: [blobConfig],
      cache: true,
      isGlobal: true,
    }),
    SequelizeModule.forFeature([OutletPhoto, Outlet, OutletProfileMetadata]),
    CustomLoggerModule,
  ],
  exports: [KafkaProducerService, UploadOutletImageProxy, LlmImageOptimizationProxy],
})
export class ImageModule {}
