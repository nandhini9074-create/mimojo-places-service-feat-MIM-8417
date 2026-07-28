import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { MerchantFilter } from './entities/merchant-filters.model';
import { MerchantFiltersService } from './services/merchant-filters.service';

@Module({
  imports: [SequelizeModule.forFeature([MerchantFilter])],
  exports: [MerchantFiltersService],
  providers: [MerchantFiltersService]
})
export class MerchantFiltersModule {}
