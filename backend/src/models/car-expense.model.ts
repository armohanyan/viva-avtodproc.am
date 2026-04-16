import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt } from './auto-id';

export class CarExpense extends Model<InferAttributes<CarExpense>, InferCreationAttributes<CarExpense>> {
  declare id: CreationOptional<number>;
  declare carId: number;
  declare amount: number;
  declare date: string;
  declare purpose: string;
  declare note: CreationOptional<string | null>;
}

CarExpense.init(
  {
    id: autoIncrementPk(),
    carId: fkUnsignedInt(),
    amount: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    purpose: { type: DataTypes.STRING(255), allowNull: false },
    note: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, tableName: 'car_expenses', modelName: 'CarExpense' },
);
