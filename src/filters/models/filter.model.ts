import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Table } from 'sequelize-typescript';
import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { Category } from 'src/category/models/category.model';
import { SubCategory } from 'src/sub-category/models/sub-category.model';
import { OutletFilters } from 'src/outlet/models/outlet-filters.model';

@Table
export class Filter extends Model<InferAttributes<Filter>, InferCreationAttributes<Filter>> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV1,
  })
  declare filterId: CreationOptional<string>;

  @Column({
    type: DataType.STRING,
  })
  declare name: string;

  @Column({
    type: DataType.STRING,
  })
  declare nameAr: string;

  @ForeignKey(() => Category)
  @Column({
    type: DataType.UUID,
  })
  declare categoryId: string;
  @BelongsTo(() => Category, 'category_id')
  declare category: Category;

  @ForeignKey(() => SubCategory)
  @Column({
    type: DataType.UUID,
  })
  declare subCategoryId: string;
  @BelongsTo(() => SubCategory, 'sub_category_id')
  declare subCategory: SubCategory;

  @HasMany(() => OutletFilters, 'filter_id')
  declare outletFilters?: OutletFilters[];

  // @HasMany(() => OutletProfileFilters, 'filter_id')
  // declare outletProfileFilters?: OutletProfileFilters[];

  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  declare updatedBy: string;
}
