import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Outlet } from './outlet.model';

@Table({
  paranoid: true,
  timestamps: true,
})
export class OutletPhoto extends Model<InferAttributes<OutletPhoto>, InferCreationAttributes<OutletPhoto>> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV1,
  })
  declare outletPhotoId: CreationOptional<string>;

  @Column({
    type: DataType.STRING(2000),
    allowNull: true,
  })
  declare cdnUrl: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare sortOrder: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare height: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare width: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  declare isActive: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  declare isDefault: boolean;

  @ForeignKey(() => Outlet)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare outletId: string;

  @BelongsTo(() => Outlet, 'outlet_id')
  declare role: Outlet;
}
