import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt } from './auto-id';

export type CarExpenseChannel = 'online' | 'pos' | 'office' | 'bank';
export type CarExpenseMethod = 'card' | 'idram' | 'cash' | 'transfer';

export class CarExpense extends Model<InferAttributes<CarExpense>, InferCreationAttributes<CarExpense>> {
  declare id: CreationOptional<number>;
  declare carId: number;
  declare amount: number;
  declare date: string;
  declare purpose: string;
  declare note: CreationOptional<string | null>;
  /** Where / how the outgoing payment was made (aligned with finance intake enums). */
  declare channel: CreationOptional<CarExpenseChannel>;
  declare method: CreationOptional<CarExpenseMethod>;
}

CarExpense.init(
  {
    id: autoIncrementPk(),
    carId: fkUnsignedInt(),
    amount: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    purpose: { type: DataTypes.STRING(255), allowNull: false },
    note: { type: DataTypes.TEXT, allowNull: true },
    channel: {
      type: DataTypes.ENUM('online', 'pos', 'office', 'bank'),
      allowNull: false,
      defaultValue: 'office',
    },
    method: {
      type: DataTypes.ENUM('card', 'idram', 'cash', 'transfer'),
      allowNull: false,
      defaultValue: 'cash',
    },
  },
  { sequelize, tableName: 'car_expenses', modelName: 'CarExpense' },
);
