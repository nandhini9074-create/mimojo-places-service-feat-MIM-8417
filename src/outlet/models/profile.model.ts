import { Table, Column, Model, DataType, HasMany, BelongsToMany } from 'sequelize-typescript';
import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { OutletProfileMapping } from './outlet-profile-mapping.model';
import { Outlet } from './outlet.model';

@Table({
  paranoid: true
})
export class Profile extends Model<InferAttributes<Profile>, InferCreationAttributes<Profile>> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV1
  })
  declare id: CreationOptional<string>;

  @Column({
    type: DataType.STRING(50),
    allowNull: false
  })
  declare name: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true
  })
  declare description: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true
  })
  declare isActive: boolean;

   @Column({
    type: DataType.BOOLEAN,
    allowNull: true
  })
  declare allowPayday: boolean;
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  declare isDefault: boolean;

  @HasMany(() => OutletProfileMapping, 'profileId')
  declare outletProfileMapping: OutletProfileMapping[];

  @BelongsToMany(() => Outlet, () => OutletProfileMapping)
outlets: Outlet[];

}
