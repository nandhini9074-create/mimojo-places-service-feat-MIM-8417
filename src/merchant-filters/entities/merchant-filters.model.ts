import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { Merchant } from '../../merchant/entities/merchant.model';
import { Filter } from 'src/filters/models/filter.model';

@Table({
  indexes: [
    {
      fields: ['merchant_id', 'filter_id']
    },
    {
      fields: ['merchant_id']
    },
    {
      fields: ['filter_id']
    }
  ]
})
export class MerchantFilter extends Model<
  InferAttributes<MerchantFilter>,
  InferCreationAttributes<MerchantFilter>
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

  @ForeignKey(() => Filter)
  @Column({
    type: DataType.UUID
  })
  declare filterId: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  declare included: boolean;

  @BelongsTo(() => Filter, 'filterId')
  declare filter: Filter;

  @BelongsTo(() => Merchant, 'merchantId')
  declare merchant: Merchant;

  @Column({
    type: DataType.UUID
  })
  declare updatedBy: string;
}
