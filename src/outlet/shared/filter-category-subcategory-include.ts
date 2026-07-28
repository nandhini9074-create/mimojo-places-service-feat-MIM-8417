import { IncludeOptions } from 'sequelize';
import { Category } from 'src/category/models/category.model';
import { Filter } from 'src/filters/models/filter.model';
import { SubCategory } from 'src/sub-category/models/sub-category.model';

/** Shared Filter include with Category and SubCategory for outlet details / outlet profile queries */
export const FILTER_WITH_CATEGORY_SUBCATEGORY_INCLUDE: IncludeOptions = {
  model: Filter,
  required: false,
  attributes: [['filter_id', 'id'], 'name'],
  include: [
    {
      model: Category,
      attributes: [['category_id', 'id'], 'name', 'imageUrl'],
      required: false,
    },
    {
      model: SubCategory,
      attributes: [['sub_category_id', 'id'], 'name', 'type'],
      required: false,
    },
  ],
};

export const FILTER_WITH_CATEGORY_SUBCATEGORY_INCLUDE_B2B: IncludeOptions = {
  model: Filter,
  required: false,
  include: [
    {
      model: Category,
      attributes: [['category_id', 'id'], 'name', 'imageUrl'],
      required: false,
    },
    {
      model: SubCategory,
      attributes: [['sub_category_id', 'id'], 'name', 'type'],
      required: false,
    },
  ],
};
