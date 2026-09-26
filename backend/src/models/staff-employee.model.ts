import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedIntNullable } from './auto-id';

/**
 * Staff directory for payroll — may or may not have a login account.
 * Lesson-based pay still requires `userId` linked to an instructor account.
 */
export type StaffEmployeePosition =
  | 'instructor'
  | 'theory_teacher'
  | 'instructor_and_theory'
  | 'director'
  | 'admin'
  | 'cleaner'
  | 'other';

export class StaffEmployee extends Model<
  InferAttributes<StaffEmployee>,
  InferCreationAttributes<StaffEmployee>
> {
  declare id: CreationOptional<number>;
  declare name: string;
  /** Optional link to users.id (instructor/admin account). */
  declare userId: CreationOptional<number | null>;
  declare position: StaffEmployeePosition;
  /** Free-text job title shown in UI (e.g. Մենեջեր). */
  declare jobTitle: string;
  declare startDateIso: string;
  declare phone: CreationOptional<string | null>;
  declare notes: CreationOptional<string | null>;
  declare isActive: CreationOptional<boolean>;
  declare createdByUserId: CreationOptional<number | null>;
}

StaffEmployee.init(
  {
    id: autoIncrementPk(),
    name: { type: DataTypes.STRING(255), allowNull: false },
    userId: fkUnsignedIntNullable(),
    position: {
      type: DataTypes.ENUM(
        'instructor',
        'theory_teacher',
        'instructor_and_theory',
        'director',
        'admin',
        'cleaner',
        'other',
      ),
      allowNull: false,
    },
    jobTitle: { type: DataTypes.STRING(128), allowNull: false, defaultValue: '' },
    startDateIso: { type: DataTypes.DATEONLY, allowNull: false },
    phone: { type: DataTypes.STRING(64), allowNull: true, defaultValue: null },
    notes: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdByUserId: fkUnsignedIntNullable(),
  },
  {
    sequelize,
    tableName: 'staff_employees',
    modelName: 'StaffEmployee',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'], name: 'staff_employees_user_idx' },
      { fields: ['is_active', 'name'], name: 'staff_employees_active_name_idx' },
      { fields: ['position'], name: 'staff_employees_position_idx' },
    ],
  },
);
