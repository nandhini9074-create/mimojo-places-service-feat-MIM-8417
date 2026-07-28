import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { MerchantFilter } from '../entities/merchant-filters.model';
import { Transaction } from 'sequelize';

@Injectable()
export class MerchantFiltersService  {
  constructor(
    @InjectModel(MerchantFilter)
    private readonly merchantFilter: MerchantFilter & typeof MerchantFilter
  ) {
  }

  async create(data: Partial<MerchantFilter>, transaction?: Transaction) {
    return this.merchantFilter.create(data, {
      transaction: transaction ?? null,
      returning: true
    });
  }

  async updateMerchantFiltersStatus(
    merchantId: string,
    filterIds: string[],
    included: boolean,
    transaction: Transaction,
    updatedBy: string
  ) {
    await this.merchantFilter.update(
      { included, updatedBy },
      {
        where: {
          merchantId: merchantId,
          filterId: filterIds
        },
        transaction
      }
    );
  }
}
