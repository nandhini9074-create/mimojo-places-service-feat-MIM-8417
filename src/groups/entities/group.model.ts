import { Column, DataType, Model, Table } from 'sequelize-typescript';
import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';


@Table({
  indexes: [
    {
      fields: ['name']
    }
  ],
  paranoid: true
})
export class Group extends Model<InferAttributes<Group>, InferCreationAttributes<Group>> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV1
  })
  declare id: CreationOptional<string>;

  @Column({
    type: DataType.STRING
  })
  declare name: string;

  @Column({
    type: DataType.STRING
  })
  declare nameAr: string;

  @Column({
    type: DataType.STRING
  })
  declare logo: string;

  @Column({
    type: DataType.UUID
  })
  declare updatedBy: string;
}
