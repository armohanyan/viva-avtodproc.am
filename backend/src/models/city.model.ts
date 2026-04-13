import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';

export class City extends Model<InferAttributes<City>, InferCreationAttributes<City>> {
  declare id: string;
  declare name: string;
}

City.init(
  {
    id: { type: DataTypes.STRING(64), primaryKey: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
  },
  { sequelize, tableName: 'cities', modelName: 'City' },
);
