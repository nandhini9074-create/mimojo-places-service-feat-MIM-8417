import { InferAttributes, InferCreationAttributes } from 'sequelize';
import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { Neighbourhood } from 'src/neighbourhood/models/neighbourhood.model';

@Table
export class Area extends Model<InferAttributes<Area>, InferCreationAttributes<Area>> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV1,
  })
  declare areaId: string;

  @Column({
    type: DataType.STRING(150),
    allowNull: true,
  })
  declare areaName: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  declare isDefault: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  declare isVirtual: boolean;

  @HasMany(() => Neighbourhood, 'areaId')
  declare Neighbourhoods: Neighbourhood[];
}
