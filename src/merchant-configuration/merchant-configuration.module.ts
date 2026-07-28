import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { MerchantConfiguration } from './entities/merchant-configuration.model';
import { MerchantConfigurationService } from './services/merchant-configuration.service';

@Module({
  imports: [SequelizeModule.forFeature([MerchantConfiguration])],
  exports: [MerchantConfigurationService],
  providers: [MerchantConfigurationService]
})
export class MerchantConfigurationModule {}
