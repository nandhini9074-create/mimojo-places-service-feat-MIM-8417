import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { BelongsTo, BelongsToMany, Column, DataType, ForeignKey, HasMany, Model, Table } from 'sequelize-typescript';
// import { Outlet } from 'src/merchant/entities/outlet.model';
// import { UserMerchantLink } from 'src/users/entities/user-merchant-link.model';
import { Filter } from 'src/filters/models/filter.model';
import { Group } from '../../groups/entities/group.model';
import { MerchantFilter } from '../../merchant-filters/entities/merchant-filters.model';
// import { MerchantUser } from '../../users/entities/merchant-users.model';
import { MerchantPaymentPlanEnum } from '../enums/merchant-payment-plan.enum';
import { MerchantStatusEnum } from '../enums/merchant-status.enum';
import { MerchantProfileMetadata } from 'src/merchant-profile/entities/merchant-profile-metadata.model';
import { MerchantPhoto } from './merchant-photo.model';
import { Outlet } from 'src/outlet/models/outlet.model';

@Table({
  paranoid: true,
  timestamps: true,
  indexes: [
    {
      fields: ['group_id'],
    },
  ],
})
export class Merchant extends Model<InferAttributes<Merchant>, InferCreationAttributes<Merchant>> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV1,
  })
  declare id: CreationOptional<string>;

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

  @ForeignKey(() => Group)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  declare groupId: CreationOptional<string>;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  country: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  city: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  classification: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  salesPerson: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  currentDateTime: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  maxOfferValue: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare crmCategoryName: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare crmSubCategoryName: string;

  @BelongsTo(() => Group, 'groupId')
  declare group: Group;

  @Column({
    type: DataType.ENUM(...Object.values(MerchantStatusEnum)),
    defaultValue: MerchantStatusEnum.PENDING,
  })
  status: MerchantStatusEnum;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare imageUrl: string;

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
    allowNull: false,
  })
  declare financeContactFirstName: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare financeContactLastName: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare financeContactJobTitle: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare financeContactEmail: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare financeContactMobile: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare tradeLicenseNumber: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare taxRegistrationNumber: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare merchantNo: string;

  @Column({
    type: DataType.ENUM(...Object.values(MerchantPaymentPlanEnum)),
    allowNull: false,
  })
  declare paymentPlan: CreationOptional<MerchantPaymentPlanEnum>;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  prepayAmount: number;

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
    type: DataType.ARRAY(DataType.STRING),
    allowNull: true,
  })
  merchantMids: string[];

  @Column({
    type: DataType.ENUM(...Object.values(MerchantStatusEnum)),
    defaultValue: MerchantStatusEnum.NOT_ENROLLED,
  })
  fastPaymentStatus: MerchantStatusEnum;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    allowNull: true,
  })
  declare artDesc: string[] | null;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    allowNull: true,
  })
  declare competitorDesc: string[] | null;

  // @BelongsToMany(() => MerchantUser, () => UserMerchantLink, 'merchantId', 'merchantUserId')
  // declare merchantAdmin: MerchantUser;

  // @BelongsToMany(() => MerchantUser, () => UserMerchantLink, 'merchantId', 'merchantUserId')
  // declare merchantUsers: MerchantUser[];

  @BelongsToMany(() => Filter, () => MerchantFilter, 'merchantId', 'filterId')
  declare filters: Filter[];

  @HasMany(() => Outlet)
  declare outlets: Outlet[];
  @HasMany(() => MerchantProfileMetadata)
  declare merchantProfiles: MerchantProfileMetadata[];

  @HasMany(() => MerchantPhoto)
  declare merchantPhotos: MerchantPhoto[];

  @Column({
    type: DataType.UUID,
  })
  declare updatedBy: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  isCircle: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: null,
  })
  isFirstActivationEmailSent: boolean;
}
