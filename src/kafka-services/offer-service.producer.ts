import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IKafkaConfig } from 'config/interface';
import { KafkaProducerService } from '../kafka-producer/kafka-producer.service';

@Injectable()
export class OfferServiceProducer {
  private config: IKafkaConfig;

  constructor(
    private readonly producerService: KafkaProducerService,
    private configService: ConfigService
  ) {
    this.config = this.configService.get('kafka-producer');
  }

  async pushToOfferService(transReference: string, notification: Record<string, unknown>) {
    console.log(notification);
    if (notification)
      await this.producerService.produce({
        topic: this.config.KAFKA_MERCHANT_OFFER_TOPIC,
        messages: [
          {
            key: transReference,
            value: JSON.stringify(notification),
          },
        ],
      });
  }
}
