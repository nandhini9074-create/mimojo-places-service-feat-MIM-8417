import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { CountryService } from './services/country.service';
import { Country } from './entities/country.model';
import { CountryController } from './controllers/country.controller';

@Module({
  controllers: [CountryController],
  providers: [CountryService],
  imports: [SequelizeModule.forFeature([Country])]
})
export class CountryModule {}
