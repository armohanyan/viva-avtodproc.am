import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt, fkUnsignedIntNullable } from './auto-id';

/** How an employee is paid for one role/activity. Multiple rules per employee are allowed. */
export type CompensationType =
  | 'fixed_monthly'
  | 'hourly_practical'
  | 'per_theory_lesson'
  | 'per_group';

/**
 * Versioned compensation rule for a staff user.
 * Historical payroll uses the rate whose [effectiveFrom, effectiveTo] covers each work day.
 */
export class EmployeeCompensationRule extends Model<
  InferAttributes<EmployeeCompensationRule>,
  InferCreationAttributes<EmployeeCompensationRule>
> {
  declare id: CreationOptional<number>;
  /** Staff directory row (required for new rules). */
  declare staffEmployeeId: CreationOptional<number | null>;
  /**
   * Linked login user when the staff employee has an account.
   * Used to match practical/theory lesson data. Nullable for custom (no-account) staff.
   */
  declare employeeUserId: CreationOptional<number | null>;
  declare compensationType: CompensationType;
  /** Display label (e.g. Հրահանգիչ, Տեսության դասախոս, Մենեջեր). */
  declare roleLabel: string;
  declare rateAmd: number;
  declare effectiveFrom: string;
  /** Inclusive end date; null = still active. */
  declare effectiveTo: CreationOptional<string | null>;
  declare notes: CreationOptional<string | null>;
  declare createdByUserId: CreationOptional<number | null>;
}

EmployeeCompensationRule.init(
  {
    id: autoIncrementPk(),
    staffEmployeeId: fkUnsignedIntNullable(),
    employeeUserId: fkUnsignedIntNullable(),
    compensationType: {
      type: DataTypes.ENUM('fixed_monthly', 'hourly_practical', 'per_theory_lesson', 'per_group'),
      allowNull: false,
    },
    roleLabel: { type: DataTypes.STRING(128), allowNull: false },
    rateAmd: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false },
    effectiveTo: { type: DataTypes.DATEONLY, allowNull: true, defaultValue: null },
    notes: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    createdByUserId: fkUnsignedIntNullable(),
  },
  {
    sequelize,
    tableName: 'employee_compensation_rules',
    modelName: 'EmployeeCompensationRule',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['staff_employee_id', 'compensation_type'], name: 'emp_comp_rules_staff_type_idx' },
      { fields: ['employee_user_id', 'compensation_type'], name: 'emp_comp_rules_employee_type_idx' },
      { fields: ['employee_user_id', 'effective_from', 'effective_to'], name: 'emp_comp_rules_effective_idx' },
    ],
  },
);
