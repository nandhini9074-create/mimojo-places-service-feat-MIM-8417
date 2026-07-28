import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { Filter } from 'src/filters/models/filter.model';
import { MerchantProfileMetadata } from 'src/merchant-profile/entities/merchant-profile-metadata.model';

@Table({
  indexes: [
    {
      unique: true,
      fields: ['merchant_profile_metadata_id', 'filter_id']
    },
    {
      fields: ['merchant_profile_metadata_id']
    },
    {
      fields: ['filter_id']
    }
  ]
})
export class MerchantProfileFilter extends Model<
  InferAttributes<MerchantProfileFilter>,
  InferCreationAttributes<MerchantProfileFilter>
> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV1
  })
  declare id: CreationOptional<string>;

  @ForeignKey(() => MerchantProfileMetadata)
  @Column({
    type: DataType.UUID
  })
  declare merchantProfileMetadataId: string;

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

  @BelongsTo(() => MerchantProfileMetadata, 'merchantProfileMetadataId')
  declare merchantProfileMetadata: MerchantProfileMetadata;

  @Column({
    type: DataType.UUID
  })
  declare updatedBy: string;
}
