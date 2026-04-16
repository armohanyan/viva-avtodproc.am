import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk } from './auto-id';

export class FleetCar extends Model<InferAttributes<FleetCar>, InferCreationAttributes<FleetCar>> {
  declare id: CreationOptional<number>;
  declare plate: string;
  declare vin: CreationOptional<string | null>;
  declare make: string;
  declare model: string;
  declare year: CreationOptional<number | null>;
  declare transmission: CreationOptional<'manual' | 'automatic' | null>;
  declare notes: CreationOptional<string | null>;
}

FleetCar.init(
  {
    id: autoIncrementPk(),
    plate: { type: DataTypes.STRING(32), allowNull: false },
    vin: { type: DataTypes.STRING(64), allowNull: true },
    make: { type: DataTypes.STRING(128), allowNull: false },
    model: { type: DataTypes.STRING(128), allowNull: false },
    year: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
    transmission: { type: DataTypes.ENUM('manual', 'automatic'), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, tableName: 'fleet_cars', modelName: 'FleetCar' },
);
