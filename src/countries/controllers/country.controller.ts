import { Controller, Get } from '@nestjs/common';
import { baseResponseHelper } from 'src/helpers/base-response.helper';
import { CountryService } from '../services/country.service';
import { ApiEndpoint } from 'src/common/decorators/api-swagger';

@Controller('countries')
export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  @Get()
  @ApiEndpoint({
    summary: 'Get countries',
    description: 'Fetch all countries'
  })
  async getCountries() {
    const res = await this.countryService.getCountries();
    return baseResponseHelper(res);
  }
}
