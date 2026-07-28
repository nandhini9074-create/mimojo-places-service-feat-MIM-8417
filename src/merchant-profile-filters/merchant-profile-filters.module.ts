import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { MerchantProfileFilter } from './entities/merchant-profile-filters.model';
import { MerchantProfileFiltersService } from './services/merchant-profile-filters.service';
import { CustomLoggerModule } from 'src/logger/logger.module';

@Module({
  imports: [SequelizeModule.forFeature([MerchantProfileFilter]), CustomLoggerModule],
  exports: [MerchantProfileFiltersService],
  providers: [MerchantProfileFiltersService]
})
export class MerchantProfileFiltersModule {}
