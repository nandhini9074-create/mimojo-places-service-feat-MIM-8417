import { InferAttributes, InferCreationAttributes } from 'sequelize';
import { Table, Column, Model, DataType, HasMany, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Merchant } from 'src/merchant/entities/merchant.model';
import { Outlet } from 'src/outlet/models/outlet.model';
import { Profile } from 'src/outlet/models/profile.model';
import { OutletProfilePhotos } from './outlet-profile-photos';
import { OutletProfileFilters } from './outlet-profile-filters';
import { OutletProfileStatusEnum } from '../enums/outlet-profile-enum';
import {
  MERCHANT_NAME_AR_COLUMN,
  MERCHANT_NAME_COLUMN,
  OUTLET_NAME_AR_COLUMN,
  OUTLET_NAME_COLUMN,
} from 'src/shared/entities/outlet-name-columns';

@Table({
  paranoid: true,
  timestamps: true,
})
export class OutletProfileMetadata extends Model<
  InferAttributes<OutletProfileMetadata>,
  InferCreationAttributes<OutletProfileMetadata>
> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV1,
  })
  declare id: string;

  @ForeignKey(() => Merchant)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare merchantId: string;
  @BelongsTo(() => Merchant, 'merchantId')
  declare merchant: Merchant;

  @ForeignKey(() => Outlet)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare outletId: string;
  @BelongsTo(() => Outlet, 'outletId')
  declare outlet: Outlet;

  @ForeignKey(() => Profile)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare profileId: string;
  @BelongsTo(() => Profile, 'profileId')
  declare profile: Profile;

  @Column(MERCHANT_NAME_COLUMN)
  declare merchantName: string;

  @Column(MERCHANT_NAME_AR_COLUMN)
  declare merchantNameAr: string;

  @Column(OUTLET_NAME_COLUMN)
  declare name: string;

  @Column(OUTLET_NAME_AR_COLUMN)
  declare nameAr: string;

  @Column({
    type: DataType.ENUM(...Object.values(OutletProfileStatusEnum)),
    allowNull: true,
  })
  declare status: OutletProfileStatusEnum;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare description: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare descriptionAr: string;
  @Column({
    type: DataType.STRING(2000),
    allowNull: true,
  })
  declare merchantLogoUrl: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  isShariah: boolean;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare maxOffer: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  hasCustomOffer: boolean;

  @HasMany(() => OutletProfilePhotos, 'outletProfileMetadataId')
  declare outletProfilePhotos: OutletProfilePhotos[];

  @HasMany(() => OutletProfileFilters, 'outletProfileMetadataId')
  declare outletProfileFilters?: OutletProfileFilters[];
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  declare updatedBy: string;
}
