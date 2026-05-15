import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedIntNullable } from './auto-id';

export type FinanceExpensePurpose = 'branch_rent' | 'salary' | 'other';
export type FinanceExpenseRelatedType = 'branch' | 'instructor';

export class FinanceExpense extends Model<
  InferAttributes<FinanceExpense>,
  InferCreationAttributes<FinanceExpense>
> {
  declare id: CreationOptional<number>;
  declare title: string;
  declare amount: number;
  declare date: string;
  declare purpose: FinanceExpensePurpose;
  declare relatedEntityType: CreationOptional<FinanceExpenseRelatedType | null>;
  declare relatedEntityId: CreationOptional<string | null>;
  declare expenseSubtype: CreationOptional<string | null>;
  declare customPurposeText: CreationOptional<string | null>;
  declare notes: CreationOptional<string | null>;
  declare createdByUserId: CreationOptional<number | null>;
}

FinanceExpense.init(
  {
    id: autoIncrementPk(),
    title: { type: DataTypes.STRING(255), allowNull: false },
    amount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    purpose: {
      type: DataTypes.ENUM('branch_rent', 'salary', 'other'),
      allowNull: false,
    },
    relatedEntityType: {
      type: DataTypes.ENUM('branch', 'instructor'),
      allowNull: true,
      defaultValue: null,
    },
    relatedEntityId: { type: DataTypes.STRING(64), allowNull: true, defaultValue: null },
    expenseSubtype: { type: DataTypes.STRING(255), allowNull: true, defaultValue: null },
    customPurposeText: { type: DataTypes.STRING(512), allowNull: true, defaultValue: null },
    notes: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    createdByUserId: fkUnsignedIntNullable(),
  },
  { sequelize, tableName: 'finance_expenses', modelName: 'FinanceExpense' },
);
