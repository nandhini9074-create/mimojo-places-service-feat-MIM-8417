import { Column, DataType, HasMany, Model, Table } from 'sequelize-typescript';
import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { Filter } from 'src/filters/models/filter.model';

@Table({
  indexes: [
    {
      fields: ['name'],
    },
  ],
})
export class Category extends Model<InferAttributes<Category>, InferCreationAttributes<Category>> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV1,
  })
  declare categoryId: CreationOptional<string>;

  @Column({
    type: DataType.STRING,
  })
  declare name: string;

  @Column({
    type: DataType.STRING,
  })
  declare nameAr: string;

  @Column({
    type: DataType.STRING,
  })
  declare imageUrl: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare darkImageUrl: string | null;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  declare isAnimated: boolean | null;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  declare isNewCategory: boolean | null;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  declare isVirtual: boolean;

  @HasMany(() => Filter, 'categoryId')
  declare filters?: Filter[];

  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  declare updatedBy: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  declare isBordered: boolean | null;
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare displayOrder: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  declare showInCa: boolean;
}
