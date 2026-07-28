import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { BelongsTo, BelongsToMany, Column, DataType, ForeignKey, HasMany, Model, Table } from 'sequelize-typescript';
import { Filter } from 'src/filters/models/filter.model';
import { MerchantProfileFilter } from 'src/merchant-profile-filters/entities/merchant-profile-filters.model';
import { Merchant } from 'src/merchant/entities/merchant.model';
import { Profile } from 'src/outlet/models/profile.model';
import { MerchantProfilePhoto } from './merchant-profile-photo.entity';
import { MerchantProfileStatusEnum } from '../enums/merchant-profile-status-enum';

@Table({
  paranoid: true,
  timestamps: true,
  // indexes: [
  //   {
  //     unique: true,
  //     fields: ['merchantId', 'profileId'],
  //   },
  // ],
})
export class MerchantProfileMetadata extends Model<
  InferAttributes<MerchantProfileMetadata>,
  InferCreationAttributes<MerchantProfileMetadata>
> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV1,
  })
  declare id: CreationOptional<string>;

  @ForeignKey(() => Merchant)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  merchantId: string;

  @BelongsTo(() => Merchant)
  merchant: Merchant;

  @ForeignKey(() => Profile)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  profileId: string;

  @BelongsTo(() => Profile)
  profile: Profile;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  nameAr: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  maxOfferValue: number;

  @Column({
    type: DataType.ENUM(...Object.values(MerchantProfileStatusEnum)),
    defaultValue: MerchantProfileStatusEnum.PENDING,
  })
  status: MerchantProfileStatusEnum;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  activeOutletsNum: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  inActiveOutletsNum: number;
  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare imageUrl: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare desc: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare descAr: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  isShariah: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  hasCustomOffer: boolean;

  @HasMany(() => MerchantProfilePhoto)
  declare merchantProfilePhotos: MerchantProfilePhoto[];

  declare updatedBy: string;
  @BelongsToMany(() => Filter, () => MerchantProfileFilter, 'merchantProfileMetadataId', 'filterId')
  declare filters: Filter[];
}
