import { Module } from '@nestjs/common';
import { KafkaConsumerService } from './kafka-consumer.service';
import { KafkaMessageConsumerService } from './kafka-message-consumer.service';
import { OutletModule } from 'src/outlet/outlet.module';
import { MerchantProfileModule } from 'src/merchant-profile/merchant-profile.module';
import { CustomLoggerModule } from 'src/logger/logger.module';

@Module({
  providers: [KafkaConsumerService, KafkaMessageConsumerService],
  exports: [KafkaConsumerService, KafkaMessageConsumerService],
  imports: [OutletModule, MerchantProfileModule, CustomLoggerModule],
})
export class KafkaConsumerModule {}
