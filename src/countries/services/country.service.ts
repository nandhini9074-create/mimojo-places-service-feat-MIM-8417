import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Country } from '../entities/country.model';

@Injectable()
export class CountryService {
  constructor(
    @InjectModel(Country)
    private readonly country: Country & typeof Country
  ) {}

  async getCountries(): Promise<Country[]> {
    return await this.country.findAll();
  }
}
