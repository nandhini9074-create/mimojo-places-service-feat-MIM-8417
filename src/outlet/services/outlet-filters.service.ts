import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Sequelize, Transaction } from 'sequelize';
import { OutletFilters } from '../models/outlet-filters.model';
import { CustomOutletFiltersDto } from 'src/outlet/dtos/custom-outlet-filter-dto';
import { MerchantMetadataUpdatedDto } from '../dtos/merchant-metadata-dto';
import { Filter } from 'src/filters/models/filter.model';
import { SubCategory } from 'src/sub-category/models/sub-category.model';
import { Category } from 'src/category/models/category.model';
import { CategoryService } from 'src/category/services/category.service';
import { SubCategoryService } from 'src/sub-category/services/sub-category.service';
import { FilterService } from 'src/filters/services/filter.service';
import { FilterDto } from 'src/filters/dtos/filter-dto';
import { CategoryDto } from 'src/category/dtos/category-dto';
import { SubCategoryDto } from 'src/sub-category/dtos/sub-category-dto';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

@Injectable()
export class OutletFilterService {
  private readonly serviceName = 'OutletFilterService';
  constructor(
    @InjectModel(OutletFilters)
    private readonly outletFiltersModel: typeof OutletFilters,
    private readonly categoryService: CategoryService,
    private readonly subcategoryService: SubCategoryService,
    private readonly filterService: FilterService,
    private readonly logger: CustomPinoLogger
  ) {}

  async insert(outletFilters: OutletFilters[], transaction: Transaction) {
    await this.deleteByOutletIds(
      outletFilters.map(o => o.outletId),
      transaction
    );
    return await this.outletFiltersModel.bulkCreate(outletFilters, { transaction });
  }

  async getOutletIdsByFilterIds(filterIds: number[]) {
    return await this.outletFiltersModel.findAll({
      attributes: ['outlet_id'],
      where: {
        filterId: { [Op.in]: filterIds },
      },
    });
  }

  async getOutletIdsUsingAndOperation(filterIds: string[], included: boolean) {
    const outletFilters = await this.outletFiltersModel.findAndCountAll({
      attributes: ['outlet_id'],
      distinct: true,
      where: {
        filterId: { [Op.in]: filterIds },
        included: included,
      },
      group: ['outlet_id'],
      having: Sequelize.literal(`COUNT(*) = ${filterIds.length}`),
    });
    return outletFilters.rows;
  }

  async getOutletIdsUsingOrOperation(filterIds: string[], included: boolean) {
    const outletFilters = await this.outletFiltersModel.findAndCountAll({
      attributes: ['outlet_id'],
      distinct: true,
      where: {
        filterId: { [Op.in]: filterIds },
        included: included,
      },
      group: ['outlet_id'],
    });
    return outletFilters.rows;
  }

  async deleteByOutletIds(ids: string[], transaction: Transaction) {
    console.log('ids', ids);
    this.outletFiltersModel.destroy({
      where: { outletId: ids },
      transaction: transaction,
    });
  }

  async deleteByOutletId(id: string, transaction: Transaction) {
    this.outletFiltersModel.destroy({
      where: { outletId: id },
      transaction: transaction,
    });
  }

  async findByFilterIdAndOutletId(filterId: string, outletId: string) {
    return this.outletFiltersModel.findOne({
      where: {
        filterId: filterId,
        outletId: outletId,
      },
    });
  }

  async insertOnlyNotCustomized(outletFilters: OutletFilters[], transaction: Transaction) {
    for (const outletFilter of outletFilters) {
      await this.outletFiltersModel.upsert(outletFilter, { transaction });
    }
  }

  async deleteNotCustomizedByOutletId(ids: string[], transaction: Transaction) {
    await this.outletFiltersModel.destroy({
      where: { outletId: ids, isCustomized: false },
      transaction: transaction,
    });
  }

  async addClonedOutletFilters(outletId: string, transaction: Transaction, userId: string, existingOutletId: string) {
    const methodName = 'addClonedOutletFilters';
    this.logger.info(`${this.serviceName}.${methodName} - starts`, { outletId, userId, existingOutletId });
    try {
      const existingOutletFilters = await this.outletFiltersModel.findAll({
        where: {
          outletId: existingOutletId,
        },
        raw: true,
      });

      let outletFilters = existingOutletFilters.map(cof => {
        return {
          outletId: outletId,
          filterId: cof.filterId,
          isCustomized: cof.isCustomized,
          included: cof.included ?? true,
          updatedBy: userId,
        } as OutletFilters;
      });

      await this.insert(outletFilters, transaction);
      this.logger.info(`${this.serviceName}.${methodName} - completed`);
    } catch (error) {
      this.logger.error(`${this.serviceName}.${methodName} - exception`, { error });
    }
  }

  async addOutletFilters(
    outlet_id: string,
    customOutletFilters: CustomOutletFiltersDto[],
    transaction: Transaction,
    userId: string
  ) {
    if (customOutletFilters && customOutletFilters.length > 0) {
      let outletFilters = customOutletFilters.map(cof => {
        return {
          outletId: outlet_id,
          filterId: cof.filter.id,
          isCustomized: cof.isCustomized,
          included: cof?.included != undefined ? cof.included : true,
          updatedBy: userId,
        } as OutletFilters;
      });
      await this.insert(outletFilters, transaction);
    } else {
      await this.deleteByOutletIds([outlet_id], transaction);
    }
  }

  async handleOutletFiltersChange(data: MerchantMetadataUpdatedDto, transaction: Transaction, outletIds: string[]) {
    if (outletIds) {
      const completeOutletFilters: OutletFilters[] = [];
      for (const outlet of outletIds) {
        let outletFilters = data.filters.map(f => {
          return {
            outletId: outlet,
            filterId: f.filterId,
            isCustomized: false,
            included: f.MerchantFilter?.included != undefined ? f.MerchantFilter?.included : true,
          } as OutletFilters;
        });
        completeOutletFilters.push(...outletFilters);
      }
      console.log(completeOutletFilters);
      await this.insert(completeOutletFilters, transaction);
    }
  }

  async handleOutletNotCustomizedFiltersChange(
    data: MerchantMetadataUpdatedDto,
    transaction: Transaction,
    outletIds: string[],
    userId: string
  ) {
    if (outletIds) {
      for (const outletId of outletIds) {
        let outletFilters = data.filters.map(f => {
          return {
            outletId: outletId,
            filterId: f.filterId,
            isCustomized: false,
            included: f.MerchantFilter?.included != undefined ? f.MerchantFilter?.included : true,
            updatedBy: userId,
          } as OutletFilters;
        });

        if (!(await this.hasOverrideFlag(outletId))) {
          await this.deleteByOutletId(outletId, transaction);
          await this.insertOnlyNotCustomized(outletFilters, transaction);
        }
      }
    }
  }

  async hasOverrideFlag(outletId: string) {
    const result = await this.outletFiltersModel.findOne({
      where: {
        outletId: outletId,
        isCustomized: true,
      },
    });
    return result == null ? false : true;
  }

  async handleFilterChange(data: FilterDto[], transaction: Transaction, userId: string) {
    if (data) {
      let filterModel = data.map(f => {
        return {
          filterId: f.filterId,
          name: f.name,
          categoryId: f.category?.id,
          subCategoryId: f.subCategory?.id,
          updatedBy: userId,
        } as Filter;
      });
      for (const filter of filterModel) {
        await this.filterService.upsert(filter, transaction);
      }
    }
  }

  async handleSubCategoryChange(data: SubCategoryDto, transaction: Transaction, userId: string) {
    if (data) {
      let subCategoryModel = {
        subCategoryId: data.id,
        name: data.name,
        type: data.type,
        updatedBy: userId,
      } as SubCategory;
      let response = await this.subcategoryService.upsert(subCategoryModel, transaction);
      return response;
    }
  }

  async handleCategoryChange(data: CategoryDto, transaction: Transaction, userId: string) {
    if (data) {
      let categoryModel = {
        categoryId: data.id,
        name: data.name,
        imageUrl: data.imageUrl,
        isVirtual: data.isVirtual,
        updatedBy: userId,
      } as Category;
      let response = await this.categoryService.upsert(categoryModel, transaction);
      return response;
    }
  }
}
