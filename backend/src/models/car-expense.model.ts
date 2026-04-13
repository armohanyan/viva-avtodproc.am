import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';

export class CarExpense extends Model<InferAttributes<CarExpense>, InferCreationAttributes<CarExpense>> {
  declare id: string;
  declare carId: string;
  declare amount: number;
  declare date: string;
  declare purpose: string;
  declare note: CreationOptional<string | null>;
}

CarExpense.init(
  {
    id: { type: DataTypes.STRING(64), primaryKey: true },
    carId: { type: DataTypes.STRING(64), allowNull: false },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    purpose: { type: DataTypes.STRING(255), allowNull: false },
    note: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, tableName: 'car_expenses', modelName: 'CarExpense' },
);
