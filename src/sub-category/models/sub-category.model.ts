import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { SubCategoryEnum } from 'src/outlet/enums/sub-category-enum';
import { Filter } from 'src/filters/models/filter.model';

@Table({
  indexes: [
    {
      fields: ['name']
    }
  ]
})
export class SubCategory extends Model<
  InferAttributes<SubCategory>,
  InferCreationAttributes<SubCategory>
> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV1
  })
  declare subCategoryId: CreationOptional<string>;

  @Column({
    type: DataType.STRING
  })
  declare name: string;

  @Column({
    type: DataType.STRING
  })
  declare nameAr: string;

  @Column({
    type: DataType.ENUM(...Object.values(SubCategoryEnum))
  })
  declare type: SubCategoryEnum;

  @Column({
    type: DataType.ENUM(...Object.values(SubCategoryEnum))
  })
  declare typeAr: SubCategoryEnum;
  
  @HasMany(() => Filter, 'sub_category_id')
  declare filters?: Filter[];

  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  declare updatedBy: string;
}
