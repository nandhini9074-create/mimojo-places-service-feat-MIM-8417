import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { Outlet } from 'src/outlet/models/outlet.model';

@Table
export class FavoriteOutlet extends Model<InferAttributes<FavoriteOutlet>, InferCreationAttributes<FavoriteOutlet>> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare favoriteOutletId: CreationOptional<number>;

  @Column({
    type: DataType.UUID,
  })
  declare userId: string;

  @ForeignKey(() => Outlet)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare outletId: string;

  @BelongsTo(() => Outlet, 'outlet_id')
  declare role: Outlet;
}
