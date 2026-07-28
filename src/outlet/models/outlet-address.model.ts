import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Outlet } from './outlet.model';
import { Neighbourhood } from 'src/neighbourhood/models/neighbourhood.model';

@Table({
  paranoid: true,
  timestamps: true,
})
export class OutletAddress extends Model<InferAttributes<OutletAddress>, InferCreationAttributes<OutletAddress>> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV1,
  })
  declare outletAddressId: CreationOptional<string>;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  declare googlePlaceId: string;

  @Column({
    type: DataType.STRING(200),
    allowNull: true,
  })
  declare formattedAddress: string;

  @Column({
    type: DataType.STRING(200),
    allowNull: true,
  })
  declare formattedAddressAr: string;

  @Column({
    type: DataType.STRING(2000),
    allowNull: true,
  })
  declare mapUrl: string;

  @Column({
    type: DataType.STRING(2000),
    allowNull: true,
  })
  declare location: string;

  @Column({
    type: DataType.STRING(2000),
    allowNull: true,
  })
  declare locationAr: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  declare latitude: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  declare longitude: number;

  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  areaId: string;

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

  @ForeignKey(() => Neighbourhood)
  @Column({
    type: DataType.UUID,
  })
  declare neighbourhoodId: string;
  @BelongsTo(() => Neighbourhood, 'neighbourhoodId')
  declare neighbourhood: Neighbourhood;

  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  declare updatedBy: string;
}
