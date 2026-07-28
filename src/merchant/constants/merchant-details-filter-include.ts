import { IncludeOptions } from 'sequelize';
import { Category } from 'src/category/models/category.model';
import { Filter } from 'src/filters/models/filter.model';
import { SubCategory } from 'src/sub-category/models/sub-category.model';

/** Shared Filter include with Category and SubCategory for merchant/details and merchant-profile queries */
export const MERCHANT_DETAILS_FILTER_INCLUDE: IncludeOptions = {
  model: Filter,
  through: { attributes: ['included'] },
  attributes: [['filter_id', 'id'], 'name', 'nameAr', 'subCategoryId', 'categoryId', 'updatedBy', 'createdAt', 'updatedAt'],
  include: [
    {
      model: Category,
      attributes: [
        ['category_id', 'id'],
        'name',
        'nameAr',
        'imageUrl',
        'darkImageUrl',
        'isAnimated',
        'isNewCategory',
        'isVirtual',
        'isBordered',
        'createdAt',
        'updatedAt',
        'updatedBy',
        'displayOrder',
      ],
    },
    {
      model: SubCategory,
      attributes: [['sub_category_id', 'id'], 'name', 'nameAr', 'type', 'updatedBy', 'typeAr', 'createdAt', 'updatedAt'],
    },
  ],
};
