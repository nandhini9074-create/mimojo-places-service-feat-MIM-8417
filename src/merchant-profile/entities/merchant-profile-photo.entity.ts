import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { Table, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { MerchantProfileMetadata } from './merchant-profile-metadata.model';
import { BaseProfilePhoto } from 'src/shared/entities/base-profile-photo.entity';

@Table({
  paranoid: true,
  timestamps: true,
})
export class MerchantProfilePhoto extends BaseProfilePhoto<
  InferAttributes<MerchantProfilePhoto>,
  InferCreationAttributes<MerchantProfilePhoto>
> {
  @ForeignKey(() => MerchantProfileMetadata)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare merchantProfileMetadataId: string;

  @BelongsTo(() => MerchantProfileMetadata)
  declare merchantProfileMetadata: MerchantProfileMetadata;
}
