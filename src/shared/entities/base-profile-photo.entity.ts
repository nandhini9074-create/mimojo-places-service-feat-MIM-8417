import { CreationOptional } from 'sequelize';
import { Column, DataType, Model } from 'sequelize-typescript';

export abstract class BaseProfilePhoto<
  TModelAttributes extends object = Record<string, unknown>,
  TCreationAttributes extends object = TModelAttributes,
> extends Model<TModelAttributes, TCreationAttributes> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV1,
  })
  declare id: CreationOptional<string>;

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
}
