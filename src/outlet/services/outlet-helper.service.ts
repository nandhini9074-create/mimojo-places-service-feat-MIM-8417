import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { CreateCustomOutletDto } from '../dtos/create-custom-outlet-dto';
import { CustomOutletFiltersDto } from '../dtos/custom-outlet-filter-dto';
import { MerchantMetadataUpdatedDto } from '../dtos/merchant-metadata-dto';
import { Outlet } from '../models/outlet.model';
import { CustomFilterDto } from 'src/filters/dtos/custom-filter-dto';
import { Filter } from 'src/filters/models/filter.model';
import { Merchant } from 'src/merchant/entities/merchant.model';
import { MerchantFilter } from 'src/merchant-filters/entities/merchant-filters.model';

@Injectable()
export class OutletHelperService {
  constructor(
    @InjectModel(Outlet)
    private readonly outletModel: typeof Outlet
  ) {}

  handlePreferencesFilter(data: CreateCustomOutletDto, merchantPreferencesFilter: CustomOutletFiltersDto[]) {
    if (data.outletFilters?.filter(f => f.filter.name.toLowerCase() === 'preferences').length > 0) {
      const outletPreferencesFilter = data.outletFilters?.filter(f => f.filter.name.toLowerCase() === 'preferences');
      merchantPreferencesFilter = merchantPreferencesFilter?.filter(f => f.filter.name.toLowerCase() != 'preferences');
      merchantPreferencesFilter.push(...outletPreferencesFilter);
    }
    return merchantPreferencesFilter;
  }

  async updateOutletMerchantLogo(data: MerchantMetadataUpdatedDto, transaction: Transaction, userId: string) {
    await this.outletModel.update(
      {
        merchantLogoUrl: data.merchantLogoUrl,
        updatedBy: userId,
      },
      {
        where: { merchantId: data.merchantId },
        transaction: transaction,
      }
    );
  }

  async updateOutletMerchantDesc(data: MerchantMetadataUpdatedDto, transaction: Transaction, userId: string) {
    await this.outletModel.update(
      {
        description: data.desc,
        updatedBy: userId,
      },
      {
        where: { merchantId: data.merchantId },
        transaction: transaction,
      }
    );
  }

  async updateOutletMerchantName(data: MerchantMetadataUpdatedDto, transaction: Transaction, userId: string) {
    await this.outletModel.update(
      {
        merchantName: data.merchantName,
        updatedBy: userId,
      },
      {
        where: { merchantId: data.merchantId },
        transaction: transaction,
      }
    );
  }

  async updateOutletArtDesc(data: MerchantMetadataUpdatedDto, transaction: Transaction, userId: string) {
    await this.outletModel.update(
      {
        artDesc: data.artDesc,
        updatedBy: userId,
      },
      {
        where: { merchantId: data.merchantId },
        transaction: transaction,
      }
    );
  }

  async updateOutletCompetitorDesc(data: MerchantMetadataUpdatedDto, transaction: Transaction, userId: string) {
    await this.outletModel.update(
      {
        competitorDesc: data.competitorDesc,
        updatedBy: userId,
      },
      {
        where: { merchantId: data.merchantId },
        transaction: transaction,
      }
    );
  }

  mapFilterDto(merchantPreferencesFilter: CustomOutletFiltersDto[], merchantMetadata: Merchant) {
    const filters = merchantMetadata?.filters || [];
    merchantPreferencesFilter = filters.map(filter => {
      const id = filter.dataValues?.id ?? (filter as { id?: string }).id;
      return {
        filter: {
          category: filter.category,
          categoryId: filter.categoryId,
          id,
          name: filter.name,
          subCategory: filter.subCategory,
          subCategoryId: filter.subCategoryId,
        } as unknown as CustomFilterDto,
        included: (filter as Filter & { MerchantFilter?: MerchantFilter }).MerchantFilter?.included,
        isCustomized: false,
      } as CustomOutletFiltersDto;
    });
    return merchantPreferencesFilter;
  }
}
