import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Filter } from 'src/filters/models/filter.model';
import { OutletProfileMetadata } from './outlet-profile.model';

@Table({
  indexes: [
    {
      unique: true,
      fields: ['outlet_profile_metadata_id', 'filter_id'],
    },
  ],
})
export class OutletProfileFilters extends Model<
  InferAttributes<OutletProfileFilters>,
  InferCreationAttributes<OutletProfileFilters>
> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV1,
  })
  declare id: CreationOptional<string>;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  declare isCustomized: boolean;

  @ForeignKey(() => Filter)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare filterId: string;

  @BelongsTo(() => Filter, 'filterId')
  declare filter: Filter;

  @ForeignKey(() => OutletProfileMetadata)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare outletProfileMetadataId: string;

  @BelongsTo(() => OutletProfileMetadata, 'outletProfileMetadataId')
  declare outletProfileMetadata: OutletProfileMetadata;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  declare included: boolean;

  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  declare updatedBy: string;

  // @HasMany(() => Filter, 'filterId')
  //   declare filters?: Filter[];
}
