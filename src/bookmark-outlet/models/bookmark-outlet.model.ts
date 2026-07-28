import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { Outlet } from 'src/outlet/models/outlet.model';

@Table
export class BookmarkOutlet extends Model<InferAttributes<BookmarkOutlet>, InferCreationAttributes<BookmarkOutlet>> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true
  })
  declare bookmarkOutletId: CreationOptional<number>;

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
