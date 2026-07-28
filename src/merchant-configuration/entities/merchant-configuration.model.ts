import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { Merchant } from '../../merchant/entities/merchant.model';

@Table({
  paranoid: false,
  indexes: [
    {
      fields: ['merchant_id']
    }
  ]
})
export class MerchantConfiguration extends Model<
  InferAttributes<MerchantConfiguration>,
  InferCreationAttributes<MerchantConfiguration>
> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV1
  })
  declare id: CreationOptional<string>;

  @ForeignKey(() => Merchant)
  @Column({
    type: DataType.UUID
  })
  declare merchantId: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  timezoneInfo: string;

  @Column({
    type: DataType.UUID
  })
  declare currencyId: string;

  @BelongsTo(() => Merchant, 'merchantId')
  declare merchant: Merchant;

  @Column({
    type: DataType.UUID
  })
  declare updatedBy: string;
}
