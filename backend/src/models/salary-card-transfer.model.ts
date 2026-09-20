import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt, fkUnsignedIntNullable } from './auto-id';

/**
 * Recurring monthly card salary for selected instructors.
 * When autoMonthly is true, the salary report shows a yellow reminder (amount is not deducted).
 */
export class SalaryCardTransfer extends Model<
  InferAttributes<SalaryCardTransfer>,
  InferCreationAttributes<SalaryCardTransfer>
> {
  declare id: CreationOptional<number>;
  declare instructorUserId: number;
  /** Display snapshot; kept even if the user account is later removed. */
  declare instructorName: string;
  declare amountAmd: number;
  /** When true, salary report automatically shows this amount as a card-transfer note. */
  declare autoMonthly: CreationOptional<boolean>;
  declare notes: CreationOptional<string | null>;
  declare createdByUserId: CreationOptional<number | null>;
}

SalaryCardTransfer.init(
  {
    id: autoIncrementPk(),
    instructorUserId: fkUnsignedInt(),
    instructorName: { type: DataTypes.STRING(255), allowNull: false },
    amountAmd: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    autoMonthly: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    notes: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    createdByUserId: fkUnsignedIntNullable(),
  },
  {
    sequelize,
    tableName: 'salary_card_transfers',
    modelName: 'SalaryCardTransfer',
    timestamps: true,
    underscored: true,
    indexes: [{ unique: true, fields: ['instructor_user_id'], name: 'salary_card_transfers_instructor_uidx' }],
  },
);
