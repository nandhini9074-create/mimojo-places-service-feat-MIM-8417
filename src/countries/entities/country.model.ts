import { Column, DataType, Model, Table } from 'sequelize-typescript';
import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';

@Table({
  paranoid: false
})
export class Country extends Model<InferAttributes<Country>, InferCreationAttributes<Country>> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV1
  })
  declare id: CreationOptional<string>;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  timezoneInfo: string;

  @Column({
    type: DataType.UUID
  })
  declare currencyId: string;

  @Column({
    type: DataType.STRING
  })
  declare icon: string;

  @Column({
    type: DataType.STRING
  })
  declare name: string;

  @Column({
    type: DataType.STRING
  })
  declare code: string;

  @Column({
    type: DataType.STRING(3)
  })
  declare isoCode: string;

  @Column({
    type: DataType.STRING
  })
  declare defaultLanguage: string;
}
