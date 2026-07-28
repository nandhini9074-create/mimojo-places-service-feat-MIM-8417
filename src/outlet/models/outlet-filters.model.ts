import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Filter } from 'src/filters/models/filter.model';
import { Outlet } from 'src/outlet/models/outlet.model';

@Table({
  indexes: [
    {
      unique: true,
      fields: ['outlet_id', 'filter_id']
    }
  ]
})
export class OutletFilters extends Model<InferAttributes<OutletFilters>, InferCreationAttributes<OutletFilters>> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV1
  })
  declare outletFilterId: CreationOptional<string>;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  declare isCustomized: boolean;

  @ForeignKey(() => Filter)
  @Column({
    type: DataType.UUID
  })
  declare filterId: string;

  @BelongsTo(() => Filter, 'filter_id')
  declare filter: Filter;

  @ForeignKey(() => Outlet)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare outletId: string;

  @BelongsTo(() => Outlet, 'outletId')
  declare outlet: Outlet;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  declare included: boolean;

  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  declare updatedBy: string;
}