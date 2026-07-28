import { InferAttributes, InferCreationAttributes } from 'sequelize';
import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasOne } from 'sequelize-typescript';
import { Area } from 'src/area/models/area.model';
import { OutletAddress } from 'src/outlet/models/outlet-address.model';

@Table
export class Neighbourhood extends Model<InferAttributes<Neighbourhood>, InferCreationAttributes<Neighbourhood>> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV1  
  })
  declare neighbourhoodId: string;

  @Column({
    type: DataType.STRING(150),
    allowNull: true,
  })
  declare neighbourhoodName: string;

  @Column({
    type: DataType.STRING(150),
    allowNull: true,
  })
  declare neighbourhoodNameAr: string;

  @ForeignKey(() => Area)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare areaId: string;
  @BelongsTo(() => Area, 'area_id')
  declare area: Area;

  @HasOne(() => OutletAddress, 'neighbourhood_id')
  declare outletAddresses?: OutletAddress;

}
