import { Injectable } from '@nestjs/common';
import { KafkaProducerService } from '../kafka-producer/kafka-producer.service';

@Injectable()
export class OutletProducer {
  constructor(private readonly producerService: KafkaProducerService) {}

  async pushToKafka(transReference: string, notification: unknown, topic: string, isCloneOffer?: string) {
    if (notification) {
      await this.producerService.produce({
        topic,
        messages: [
          {
            key: transReference,
            value: JSON.stringify(notification),
            ...(isCloneOffer !== undefined && {
              headers: {
                isCloneOffer,
              },
            }),
          },
        ],
      });
    }
  }
}
