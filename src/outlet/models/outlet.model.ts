import { InferAttributes, InferCreationAttributes } from 'sequelize';
import { Table, Column, Model, DataType, HasMany, HasOne, ForeignKey, BelongsTo, BelongsToMany } from 'sequelize-typescript';
import { OutletSourceEnum } from '../enums/outlet-source-enum';
import { OutletFastPaymentStatusEnum, OutletStatusEnum } from '../enums/outlet-status-enum';
import { OutletAddress } from './outlet-address.model';
import { OutletPhoto } from './outlet-photo.model';
import { OutletTiming } from './outlet-timing.model';
import { OutletFilters } from 'src/outlet/models/outlet-filters.model';
import { FavoriteOutlet } from 'src/favorite-outlet/models/favorite-outlet.model';
import { OutletProfileMetadata } from 'src/outlet-profile/entities/outlet-profile.model';
import { Merchant } from 'src/merchant/entities/merchant.model';
import { OutletProfileMapping } from './outlet-profile-mapping.model';
import { Profile } from './profile.model';
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
export class Outlet extends Model<InferAttributes<Outlet>, InferCreationAttributes<Outlet>> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV1,
  })
  declare outletId: string;

  @ForeignKey(() => Merchant)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare merchantId: string;
  @BelongsTo(() => Merchant)
  merchant: Merchant;
  @Column(MERCHANT_NAME_COLUMN)
  declare merchantName: string;

  @Column(MERCHANT_NAME_AR_COLUMN)
  declare merchantNameAr: string;

  @Column(OUTLET_NAME_COLUMN)
  declare name: string;

  @Column(OUTLET_NAME_AR_COLUMN)
  declare nameAr: string;

  @Column({
    type: DataType.DECIMAL,
    allowNull: true,
  })
  declare rating: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare priceLevel: number;

  @Column({
    type: DataType.STRING(2000),
    allowNull: true,
  })
  declare website: string;

  @Column({
    type: DataType.STRING(2000),
    allowNull: true,
  })
  declare websiteAr: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  declare formattedPhoneNumber: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  declare businessStatus: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare userRatingsTotal: number;

  @Column({
    type: DataType.ENUM(...Object.values(OutletStatusEnum)),
    allowNull: true,
  })
  declare status: OutletStatusEnum;

  @Column({
    type: DataType.ENUM(...Object.values(OutletFastPaymentStatusEnum)),
    allowNull: true,
  })
  declare fastPaymentStatus: OutletFastPaymentStatusEnum;

  @Column({
    type: DataType.ARRAY(DataType.STRING(100)),
    allowNull: true,
  })
  declare merchantIdsManual: string[];

  @Column({
    type: DataType.ARRAY(DataType.STRING(100)),
    allowNull: true,
  })
  declare posIds: string[];

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare description: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare descriptionAr: string;

  @Column({
    type: DataType.ENUM(...Object.values(OutletSourceEnum)),
    allowNull: true,
  })
  declare source: OutletSourceEnum;

  @Column({
    type: DataType.STRING(2000),
    allowNull: true,
  })
  declare menuUrl: string;

  @Column({
    type: DataType.STRING(2000),
    allowNull: true,
  })
  declare menuUrlAr: string;

  @Column({
    type: DataType.STRING(2000),
    allowNull: true,
  })
  declare bookingUrl: string;

  @Column({
    type: DataType.STRING(2000),
    allowNull: true,
  })
  declare bookingUrlAr: string;

  @Column({
    type: DataType.STRING(2000),
    allowNull: true,
  })
  declare merchantLogoUrl: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare maxOffer: number;

  @Column({
    type: DataType.STRING(10),
    allowNull: true,
  })
  declare outletNo: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  declare hasCustomOffer: boolean;

  @Column({
    type: DataType.ARRAY(DataType.JSONB),
    allowNull: true,
  })
  declare midPidRelation: JSON[];

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  declare checkTerminal: boolean;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    allowNull: true,
  })
  declare artDesc: string[];

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    allowNull: true,
  })
  declare competitorDesc: string[];

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  declare hasClone: boolean;

  @HasOne(() => OutletAddress, 'outletId')
  declare outletAddress: OutletAddress;

  @HasOne(() => OutletTiming, 'outletId')
  declare outletTiming: OutletTiming;

  @HasMany(() => OutletPhoto, 'outletId')
  declare outletPhotos: OutletPhoto[];

  @HasMany(() => OutletFilters, 'outletId')
  declare outletFilters?: OutletFilters[];

  @HasMany(() => FavoriteOutlet, 'outletId')
  declare favorites?: FavoriteOutlet[];

  @HasMany(() => OutletProfileMetadata)
  profileOutlets: OutletProfileMetadata[];

  @BelongsToMany(() => Profile, () => OutletProfileMapping)
  profiles: Profile[];

  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  declare updatedBy: string;
}
