import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Outlet } from './outlet.model';
import { Profile } from './profile.model';

@Table({
  paranoid: true,
  indexes: [
    {
      fields: ['outlet_id']
    }
  ]
})
export class OutletProfileMapping extends Model<
  InferAttributes<OutletProfileMapping>,
  InferCreationAttributes<OutletProfileMapping>
> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV1
  })
  declare id: CreationOptional<string>;

  @ForeignKey(() => Outlet)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare outletId: string;
  @BelongsTo(() => Outlet, 'outletId')
  declare outlet: Outlet;

  @ForeignKey(() => Profile)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare profileId: string;
  @BelongsTo(() => Profile, 'profileId')
  declare profile: Profile;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  declare startDate: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  declare endDate: Date;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true
  })
  declare isActive: boolean;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  updatedBy: string;

  @Column({
    type: DataType.DATE
  })
  declare createdAt: Date;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    allowNull: true
  })
  declare allowedBins: string[];
}
