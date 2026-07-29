import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IKafkaConsumerConfig } from 'config/interface';
import { KafkaConsumerService } from './kafka-consumer.service';
import { OutletService } from '../outlet/services/outlet.service';
import { MerchantProfileService } from '../merchant-profile/services/merchant-profile.service';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

@Injectable()
export class KafkaMessageConsumerService implements OnModuleInit {
  private readonly config: IKafkaConsumerConfig;
  constructor(
    private readonly kafkaConsumerService: KafkaConsumerService,
    private readonly configService: ConfigService,
    private readonly outletService: OutletService,
    private readonly merchantProfileService: MerchantProfileService,
    private readonly logger: CustomPinoLogger
  ) {
    this.config = this.configService.get('kafka-consumer');
  }

  async onModuleInit() {
    await this.receiveMaxValueForOutlets();
  }

  async receiveMaxValueForOutlets() {
    /*await this.kafkaConsumerService.consume(
      {
        topics: [this.config.KAFKA_MAX_OFFER_TOPIC],
        fromBeginning: this.config.KAFKA_FROM_BEGINING,
      },
      {
        autoCommit: this.config.KAFKA_AUTO_COMMIT,
        eachMessage: async ({ message }) => {
          try {
            console.log('Kafka notification receive max offer - ', JSON.parse(Buffer.from(message.value).toString('utf-8')));
            const key = message.key ? Buffer.from(message.key).toString('utf-8') : null;
            const body = JSON.parse(Buffer.from(message.value).toString('utf-8'));
            if (key === 'outlet') {
              await this.outletService.updateMaxOffer(body);
            }
            if (key === 'merchant') {
              // Producer sends an array payload, while the HTTP endpoint wraps it in { updates: [...] }.
              const updates = Array.isArray(body) ? body : (body?.updates ?? []);
              await this.merchantProfileService.updateMerchantMopMaxOffersCustomOffer(updates);
            }
          } catch (error) {
            console.log('Kafka notification receive max offer error - ', error);
            this.logger.error('Kafka error notification receive max offer - ', {
              error,
              body: `${Buffer.from(message.value).toString('utf-8')}`,
            });
          }
        },
      },
      this.config.KAFKA_OFFER_MAX_VALUE_GROUP
    );*/
  }
}
