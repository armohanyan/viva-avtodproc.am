import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt, fkUnsignedIntNullable } from './auto-id';

export type SalaryAdjustmentKind = 'bonus' | 'additional' | 'deduction' | 'other';

/** Manual payroll adjustment applied when the adjustment date falls inside the payroll period. */
export class SalaryAdjustment extends Model<
  InferAttributes<SalaryAdjustment>,
  InferCreationAttributes<SalaryAdjustment>
> {
  declare id: CreationOptional<number>;
  declare employeeUserId: number;
  declare employeeName: string;
  declare dateIso: string;
  declare kind: SalaryAdjustmentKind;
  /** Always stored positive; sign comes from kind (deduction subtracts). */
  declare amountAmd: number;
  declare title: string;
  declare notes: CreationOptional<string | null>;
  declare createdByUserId: CreationOptional<number | null>;
}

SalaryAdjustment.init(
  {
    id: autoIncrementPk(),
    employeeUserId: fkUnsignedInt(),
    employeeName: { type: DataTypes.STRING(255), allowNull: false },
    dateIso: { type: DataTypes.DATEONLY, allowNull: false },
    kind: {
      type: DataTypes.ENUM('bonus', 'additional', 'deduction', 'other'),
      allowNull: false,
    },
    amountAmd: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    createdByUserId: fkUnsignedIntNullable(),
  },
  {
    sequelize,
    tableName: 'salary_adjustments',
    modelName: 'SalaryAdjustment',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['employee_user_id', 'date_iso'], name: 'salary_adjustments_employee_date_idx' },
      { fields: ['date_iso'], name: 'salary_adjustments_date_idx' },
    ],
  },
);
