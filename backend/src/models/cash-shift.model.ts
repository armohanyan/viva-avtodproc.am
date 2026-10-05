import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt, fkUnsignedIntNullable } from './auto-id';

export const CASH_SHIFT_STATUSES = ['OPEN', 'CLOSED'] as const;
export type CashShiftStatus = (typeof CASH_SHIFT_STATUSES)[number];

/**
 * One physical drawer session per branch.
 * `openBranchKey` is `branch_id` while OPEN and NULL when CLOSED so a unique index
 * allows only one open shift per branch (MySQL permits many NULLs).
 */
export class CashShift extends Model<InferAttributes<CashShift>, InferCreationAttributes<CashShift>> {
  declare id: CreationOptional<number>;
  declare adminId: number;
  declare branchId: number;
  declare closedByUserId: CreationOptional<number | null>;
  declare openingBalance: number;
  declare cashInTotal: CreationOptional<number | null>;
  declare cashOutTotal: CreationOptional<number | null>;
  declare expectedBalance: CreationOptional<number | null>;
  declare actualBalance: CreationOptional<number | null>;
  declare status: CashShiftStatus;
  declare openedAt: Date;
  declare closedAt: CreationOptional<Date | null>;
  declare openBranchKey: CreationOptional<number | null>;
}

CashShift.init(
  {
    id: autoIncrementPk(),
    adminId: fkUnsignedInt(),
    branchId: fkUnsignedInt(),
    closedByUserId: fkUnsignedIntNullable(),
    openingBalance: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    cashInTotal: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null },
    cashOutTotal: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null },
    expectedBalance: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    actualBalance: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null },
    status: { type: DataTypes.ENUM(...CASH_SHIFT_STATUSES), allowNull: false },
    openedAt: { type: DataTypes.DATE, allowNull: false },
    closedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    openBranchKey: fkUnsignedIntNullable(),
  },
  {
    sequelize,
    tableName: 'cash_shifts',
    modelName: 'CashShift',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['open_branch_key'] },
      { fields: ['branch_id', 'opened_at'] },
      { fields: ['status'] },
    ],
  },
);
