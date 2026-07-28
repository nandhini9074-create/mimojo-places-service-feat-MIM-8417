import { Module } from '@nestjs/common';
import { MerchantIdentityProxy } from './services/merchant-identity.proxy';
import { CustomLoggerModule } from 'src/logger/logger.module';
import { OfferServiceProxy } from './services/offer-service.proxy';


@Module({
  imports: [CustomLoggerModule],
  controllers: [],
  providers: [MerchantIdentityProxy, OfferServiceProxy],
  exports: [OfferServiceProxy]
})
export class ProxyModule {}
