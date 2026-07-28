import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import axios from 'axios';
import { EnvKeysEnum } from 'config/env.enum';
import { Category } from 'src/category/models/category.model';
import { Filter } from 'src/filters/models/filter.model';
import { SubCategory } from 'src/sub-category/models/sub-category.model';
import { CustomPinoLogger } from 'src/logger/custom-logger.service';

@Injectable()
export class SeederCategoryService {
  constructor(
    @InjectModel(Category) private readonly categoryModel: typeof Category,
    @InjectModel(Filter) private readonly filterModel: typeof Filter,
    @InjectModel(SubCategory) private readonly subCategoryModel: typeof SubCategory,
    private readonly logger: CustomPinoLogger
  ) {}

  async syncCategory(): Promise<{ updatedCount: number }> {
    try {
      const response = await axios.get(`${process.env[EnvKeysEnum.IDENTITY_URL]}/categories/sync`);
      let updatedCount = 0;
      const categories = response?.data?.data;
      for (const category of categories) {
        const [affectedRows] = await this.categoryModel.update(
          {
            isBordered: category.isBordered,
            displayOrder: category.displayOrder,
          },
          { where: { categoryId: category.id } }
        );
        updatedCount += affectedRows;
      }
      return { updatedCount };
    } catch (error) {
      throw new HttpException('failed to sync', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async migrateFilters(): Promise<{ totalInserted: number }> {
    try {
      const limit = 500;
      let skip = 0;
      let totalInserted = 0;
      const existingFilters = await this.filterModel.findAll({ attributes: ['filterId'] });
      const existingFilterIds = new Set(existingFilters.map(f => f.filterId));
      for (;;) {
        const response = await axios.get(`${process.env[EnvKeysEnum.IDENTITY_URL]}/merchant-filters/migrate-filters`, {
          params: { limit, skip },
        });

        const identityFilters = response?.data?.data;
        if (!identityFilters?.length) break;
        const notExistingFilters = identityFilters
          .filter(f => !existingFilterIds.has(f.id))
          .map(f => ({
            filterId: f.id,
            ...f,
          }));
        if (notExistingFilters.length) {
          await this.filterModel.bulkCreate(notExistingFilters);
          totalInserted += notExistingFilters.length;
        }

        skip += limit;
      }
      return { totalInserted };
    } catch (error) {
      this.logger.error('seederService.migrateFilters failed', { error });
      throw new HttpException('migratefilters failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async migrateSubCategories(): Promise<{ totalInserted: number }> {
    try {
      const limit = 500;
      let skip = 0;
      let totalInserted = 0;
      const existingSubCategories = await this.subCategoryModel.findAll({
        attributes: ['subCategoryId'],
      });
      const existingSubCategoryIds = new Set(existingSubCategories.map(sc => sc.subCategoryId));
      for (;;) {
        const response = await axios.get(`${process.env[EnvKeysEnum.IDENTITY_URL]}/sub-categories/migrate`, {
          params: { limit, skip },
        });

        const identitySubCategories = response?.data?.data;
        if (!identitySubCategories?.length) break;
        const notExistingSubCategories = identitySubCategories
          .filter(sc => !existingSubCategoryIds.has(sc.id))
          .map(sc => ({
            subCategoryId: sc.id,
            ...sc,
          }));
        if (notExistingSubCategories.length) {
          await this.subCategoryModel.bulkCreate(notExistingSubCategories);
          totalInserted += notExistingSubCategories.length;
        }

        skip += limit;
      }
      return { totalInserted };
    } catch (error) {
      this.logger.error('SeederService.migrateSubCategories failed', { error });
      throw new HttpException('migrateSubCategories failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
