import { Injectable } from '@nestjs/common';
import { Op, Transaction } from 'sequelize';
import { InjectModel } from '@nestjs/sequelize';
import { Filter } from '../models/filter.model';
import { SubCategory } from 'src/sub-category/models/sub-category.model';

@Injectable()
export class FilterService {
  constructor(@InjectModel(Filter) private readonly filterModel: typeof Filter) {}

  async insert(filters: Filter[], transaction: Transaction): Promise<Filter[]> {
    await this.deleteByIds(
      filters.map(f => f.filterId),
      transaction
    );
    const response = await this.filterModel.bulkCreate(filters, { transaction });
    return response;
  }

  async upsert(filter: Filter, transaction: Transaction): Promise<Filter> {
    const [response] = await this.filterModel.upsert(filter, { transaction });
    return response;
  }

  async deleteByIds(ids: string[], transaction: Transaction) {
    await this.filterModel.destroy({
      where: { filterId: ids },
      transaction: transaction,
    });
  }

  async getFilterIdsByCategoryId(categoryId: string) {
    return await this.filterModel.findAll({
      attributes: ['filter_id'],
      where: {
        categoryId: categoryId,
      },
    });
  }

  async getByFilterIds(filterIds: string[]) {
    return await this.filterModel.findAll({
      attributes: ['filterId', 'name'],
      include: [
        {
          model: SubCategory,
          attributes: ['name', 'type'],
        },
      ],
      where: {
        filterId: { [Op.in]: filterIds },
      },
    });
  }
}
