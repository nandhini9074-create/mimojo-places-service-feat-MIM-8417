import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import axios from 'axios';
import { EnvKeysEnum } from 'config/env.enum';
import { Merchant } from 'src/merchant/entities/merchant.model';
import { MerchantConfiguration, MerchantFilter, Group, Country } from '../seeder-models';

type BulkCreateModel = { bulkCreate: (data: unknown[]) => Promise<unknown> };

@Injectable()
export class SeederIdentityMigrationService {
  private readonly limit = 500;
  private readonly baseUrl = () => process.env[EnvKeysEnum.IDENTITY_URL];

  constructor(
    @InjectModel(Merchant) private readonly merchantModel: typeof Merchant,
    @InjectModel(MerchantFilter) private readonly merchantFilterModel: typeof MerchantFilter,
    @InjectModel(MerchantConfiguration) private readonly merchantConfiguration: typeof MerchantConfiguration,
    @InjectModel(Group) private readonly groupModel: typeof Group,
    @InjectModel(Country) private readonly countryModel: typeof Country
  ) {}

  async migrateMerchant(): Promise<{ totalInserted: number }> {
    return this.migratePaginated('/merchants/migrate', this.merchantModel as BulkCreateModel);
  }

  async migrateMerchantFilters(): Promise<{ totalInserted: number }> {
    return this.migratePaginated('/merchant-filters/migrate', this.merchantFilterModel as BulkCreateModel);
  }

  async migrateMerchantConfigurations(): Promise<{ totalInserted: number }> {
    return this.migratePaginated('/merchant-configurations/migrate', this.merchantConfiguration as BulkCreateModel);
  }

  async migrateGroups(): Promise<{ totalInserted: number }> {
    return this.migratePaginated('/groups/migrate', this.groupModel as BulkCreateModel);
  }

  async migrateCountries(): Promise<{ totalInserted: number }> {
    return this.migratePaginated('/countries/migrate', this.countryModel as BulkCreateModel);
  }

  private async migratePaginated(endpoint: string, model: BulkCreateModel): Promise<{ totalInserted: number }> {
    let skip = 0;
    let totalFetched = 0;
    try {
      for (;;) {
        const response = await axios.get(`${this.baseUrl()}${endpoint}`, {
          params: { limit: this.limit, skip },
        });
        const data = response?.data?.data;
        if (!data?.length) break;
        await model.bulkCreate(data);
        totalFetched += data.length;
        skip += this.limit;
      }
      return { totalInserted: totalFetched };
    } catch (error) {
      throw new HttpException('migration failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
