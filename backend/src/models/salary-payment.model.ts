import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedIntNullable } from './auto-id';

export type SalaryPaymentKind = 'instructor' | 'theory_teacher' | 'other' | 'payroll';
export type SalaryPaymentStatus = 'approved' | 'paid';

/** A submitted salary payout: lesson-based, full payroll snapshot, or a manual "other" salary. */
export class SalaryPayment extends Model<
  InferAttributes<SalaryPayment>,
  InferCreationAttributes<SalaryPayment>
> {
  declare id: CreationOptional<number>;
  declare title: string;
  declare kind: SalaryPaymentKind;
  /** Null for "other" salaries not tied to a system account. */
  declare employeeUserId: CreationOptional<number | null>;
  /** Display snapshot; kept even if the user account is later removed. */
  declare employeeName: string;
  declare periodStartIso: string;
  declare periodEndIso: string;
  /** Null for manual "other" / multi-line payroll salaries. */
  declare lessonsCount: CreationOptional<number | null>;
  /** AMD per lesson at payout time; null for manual / multi-line payroll. */
  declare ratePerLessonAmd: CreationOptional<number | null>;
  declare totalAmd: number;
  /** approved = locked calculation; paid = money transferred. */
  declare status: CreationOptional<SalaryPaymentStatus>;
  /** JSON snapshot of calculation lines for payroll kind (historical rates). */
  declare breakdownJson: CreationOptional<string | null>;
  declare notes: CreationOptional<string | null>;
  declare createdByUserId: CreationOptional<number | null>;
}

SalaryPayment.init(
  {
    id: autoIncrementPk(),
    title: { type: DataTypes.STRING(255), allowNull: false },
    kind: {
      type: DataTypes.ENUM('instructor', 'theory_teacher', 'other', 'payroll'),
      allowNull: false,
    },
    employeeUserId: fkUnsignedIntNullable(),
    employeeName: { type: DataTypes.STRING(255), allowNull: false },
    periodStartIso: { type: DataTypes.DATEONLY, allowNull: false },
    periodEndIso: { type: DataTypes.DATEONLY, allowNull: false },
    lessonsCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null },
    ratePerLessonAmd: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null },
    totalAmd: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    status: {
      type: DataTypes.ENUM('approved', 'paid'),
      allowNull: false,
      defaultValue: 'paid',
    },
    breakdownJson: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    notes: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    createdByUserId: fkUnsignedIntNullable(),
  },
  {
    sequelize,
    tableName: 'salary_payments',
    modelName: 'SalaryPayment',
    timestamps: true,
    underscored: true,
  },
);
