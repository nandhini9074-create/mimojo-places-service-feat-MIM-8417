import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { Table, Column, DataType, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { Merchant } from './merchant.model';
import { BaseProfilePhoto } from 'src/shared/entities/base-profile-photo.entity';

@Table({
  paranoid: true,
  timestamps: true,
})
export class MerchantPhoto extends BaseProfilePhoto<InferAttributes<MerchantPhoto>, InferCreationAttributes<MerchantPhoto>> {
  @ForeignKey(() => Merchant)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare merchantId: string;
  @BelongsTo(() => Merchant)
  merchant: Merchant;
}
