import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { FilterService } from './services/filter.service';
import { Filter } from './models/filter.model';

@Module({
  imports: [SequelizeModule.forFeature([Filter])],
  providers: [FilterService],
  exports: [FilterService]
})
export class FiltersModule {}
