import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import type { PetrolType } from '../constants/petrol-type';
import { PETROL_TYPES } from '../constants/petrol-type';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt, fkUnsignedIntNullable } from './auto-id';

export const PETROL_EXPENSE_REQUEST_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type PetrolExpenseRequestStatus = (typeof PETROL_EXPENSE_REQUEST_STATUSES)[number];

/** Instructor-submitted fuel expense awaiting super-admin approval; approval creates a `PetrolExpense` row. */
export class PetrolExpenseRequest extends Model<
  InferAttributes<PetrolExpenseRequest>,
  InferCreationAttributes<PetrolExpenseRequest>
> {
  declare id: CreationOptional<number>;
  declare instructorUserId: number;
  declare carId: number;
  declare date: string;
  /** "HH:MM" purchase time reported by the instructor. */
  declare time: CreationOptional<string | null>;
  declare petrolType: PetrolType;
  declare price: number;
  declare photoUrl: string;
  declare description: CreationOptional<string | null>;
  declare status: CreationOptional<PetrolExpenseRequestStatus>;
  declare decisionNote: CreationOptional<string | null>;
  declare decidedByUserId: CreationOptional<number | null>;
  declare decidedAt: CreationOptional<Date | null>;
  /** `petrol_expenses.id` created on approval. */
  declare petrolExpenseId: CreationOptional<number | null>;
}

PetrolExpenseRequest.init(
  {
    id: autoIncrementPk(),
    instructorUserId: fkUnsignedInt(),
    carId: fkUnsignedInt(),
    date: { type: DataTypes.DATEONLY, allowNull: false },
    time: { type: DataTypes.STRING(5), allowNull: true, defaultValue: null },
    petrolType: {
      type: DataTypes.ENUM(...PETROL_TYPES),
      allowNull: false,
      defaultValue: 'benzin',
    },
    price: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    photoUrl: { type: DataTypes.STRING(500), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    status: {
      type: DataTypes.ENUM(...PETROL_EXPENSE_REQUEST_STATUSES),
      allowNull: false,
      defaultValue: 'pending',
    },
    decisionNote: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    decidedByUserId: fkUnsignedIntNullable(),
    decidedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    petrolExpenseId: fkUnsignedIntNullable(),
  },
  {
    sequelize,
    tableName: 'petrol_expense_requests',
    modelName: 'PetrolExpenseRequest',
    timestamps: true,
    underscored: true,
  },
);
