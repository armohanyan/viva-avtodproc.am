import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedIntNullable } from './auto-id';

export type SalaryPaymentKind = 'instructor' | 'theory_teacher' | 'other';

/** A submitted salary payout: lesson-based (instructor / theory teacher) or a manual "other" salary. */
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
  /** Null for manual "other" salaries. */
  declare lessonsCount: CreationOptional<number | null>;
  /** AMD per lesson at payout time; null for manual "other" salaries. */
  declare ratePerLessonAmd: CreationOptional<number | null>;
  declare totalAmd: number;
  declare notes: CreationOptional<string | null>;
  declare createdByUserId: CreationOptional<number | null>;
}

SalaryPayment.init(
  {
    id: autoIncrementPk(),
    title: { type: DataTypes.STRING(255), allowNull: false },
    kind: {
      type: DataTypes.ENUM('instructor', 'theory_teacher', 'other'),
      allowNull: false,
    },
    employeeUserId: fkUnsignedIntNullable(),
    employeeName: { type: DataTypes.STRING(255), allowNull: false },
    periodStartIso: { type: DataTypes.DATEONLY, allowNull: false },
    periodEndIso: { type: DataTypes.DATEONLY, allowNull: false },
    lessonsCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null },
    ratePerLessonAmd: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null },
    totalAmd: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
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
