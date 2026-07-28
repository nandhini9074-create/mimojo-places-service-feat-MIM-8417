import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Outlet } from './outlet.model';

@Table({
  paranoid: true,
  timestamps: true,
})
export class OutletTiming extends Model<InferAttributes<OutletTiming>, InferCreationAttributes<OutletTiming>> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV1
  })
  declare outletTimingId: CreationOptional<string>;

  @Column({
    type: DataType.ARRAY(DataType.JSONB),
    allowNull: true,
  })
  declare weekdayText: JSON[];

  @Column({
    type: DataType.ARRAY(DataType.JSONB),
    allowNull: true,
  })
  declare weekdayTextAr: JSON[];

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  declare isActive: boolean;
  
  @ForeignKey(() => Outlet)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare outletId: string;

  @BelongsTo(() => Outlet, 'outlet_id')
  declare role: Outlet;

  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  declare updatedBy: string;

}
