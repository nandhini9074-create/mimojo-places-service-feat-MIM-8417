import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { Table, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { OutletProfileMetadata } from './outlet-profile.model';
import { BaseProfilePhoto } from 'src/shared/entities/base-profile-photo.entity';

@Table({
  paranoid: true,
  timestamps: true,
})
export class OutletProfilePhotos extends BaseProfilePhoto<
  InferAttributes<OutletProfilePhotos>,
  InferCreationAttributes<OutletProfilePhotos>
> {
  @ForeignKey(() => OutletProfileMetadata)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare outletProfileMetadataId: string;

  @BelongsTo(() => OutletProfileMetadata, 'outletProfileMetadataId')
  declare outletProfileMetadata: OutletProfileMetadata;
}
