import { MerchantFilter } from 'src/merchant-filters/entities/merchant-filters.model';
import { MerchantConfiguration } from 'src/merchant-configuration/entities/merchant-configuration.model';
import { Group } from 'src/groups/entities/group.model';
import { Country } from 'src/countries/entities/country.model';
import { MerchantProfileMetadata } from 'src/merchant-profile/entities/merchant-profile-metadata.model';

export { MerchantFilter, MerchantConfiguration, Group, Country, MerchantProfileMetadata };

export const SEEDER_MERCHANT_PROFILE_MODELS = [
  MerchantFilter,
  MerchantConfiguration,
  Group,
  Country,
  MerchantProfileMetadata,
];
