import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk } from './auto-id';

export class City extends Model<InferAttributes<City>, InferCreationAttributes<City>> {
  declare id: CreationOptional<number>;
  declare name: string;
}

City.init(
  {
    id: autoIncrementPk(),
    name: { type: DataTypes.STRING(255), allowNull: false },
  },
  { sequelize, tableName: 'cities', modelName: 'City' },
);
