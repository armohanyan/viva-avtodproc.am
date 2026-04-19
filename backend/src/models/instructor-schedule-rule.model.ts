import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt } from './auto-id';

/** 1 = Mon … 7 = Sun (ISO-Monday style for admin UI). */
export type InstructorWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Instructor schedule for practical booking slots.
 *
 * - `work_hours` — weekly window when lessons may be booked (if any exist, slots outside are closed).
 * - `lunch` — one row: daily lunch break window (default 14:00–15:00); admin can change times. Applies every calendar day.
 * - `recurring_busy` — same weekday every week (e.g. every Tue 15:00–18:00 unavailable).
 * - `day_off` — specific calendar day fully or partially unavailable (`allDay` or time window).
 * - `date_busy` — one-off busy window on a given date (meetings, errands, etc.).
 */
export type InstructorScheduleRuleKind = 'work_hours' | 'lunch' | 'recurring_busy' | 'day_off' | 'date_busy';

export class InstructorScheduleRule extends Model<
  InferAttributes<InstructorScheduleRule>,
  InferCreationAttributes<InstructorScheduleRule>
> {
  declare id: CreationOptional<number>;
  declare instructorUserId: number;
  declare ruleKind: InstructorScheduleRuleKind;
  /** For weekly rules: 1=Mon … 7=Sun. Null for date-based rules. */
  declare weekday: CreationOptional<number | null>;
  declare dateIso: CreationOptional<string | null>;
  declare timeStart: CreationOptional<string | null>;
  declare timeEnd: CreationOptional<string | null>;
  declare allDay: CreationOptional<boolean>;
}

InstructorScheduleRule.init(
  {
    id: autoIncrementPk(),
    instructorUserId: fkUnsignedInt(),
    ruleKind: {
      type: DataTypes.ENUM('work_hours', 'lunch', 'recurring_busy', 'day_off', 'date_busy'),
      allowNull: false,
    },
    weekday: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
    dateIso: { type: DataTypes.DATEONLY, allowNull: true },
    timeStart: { type: DataTypes.STRING(5), allowNull: true },
    timeEnd: { type: DataTypes.STRING(5), allowNull: true },
    allDay: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { sequelize, tableName: 'instructor_schedule_rules', modelName: 'InstructorScheduleRule' },
);
