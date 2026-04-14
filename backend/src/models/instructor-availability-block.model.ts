import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';

/** 1 = Mon … 7 = Sun (ISO-Monday style for admin UI). */
export type InstructorWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type InstructorAvailabilityRuleKind =
  | 'weekly_work'
  | 'weekly_break'
  | 'weekday_lunch'
  | 'date_off'
  | 'date_break';

export class InstructorAvailabilityBlock extends Model<
  InferAttributes<InstructorAvailabilityBlock>,
  InferCreationAttributes<InstructorAvailabilityBlock>
> {
  declare id: string;
  declare instructorUserId: string;
  declare ruleKind: InstructorAvailabilityRuleKind;
  /** For `weekly_*`: 1=Mon … 7=Sun. Null for date-based rules. */
  declare weekday: CreationOptional<number | null>;
  declare dateIso: CreationOptional<string | null>;
  declare timeStart: CreationOptional<string | null>;
  declare timeEnd: CreationOptional<string | null>;
  declare allDay: CreationOptional<boolean>;
}

InstructorAvailabilityBlock.init(
  {
    id: { type: DataTypes.STRING(64), primaryKey: true },
    instructorUserId: { type: DataTypes.STRING(64), allowNull: false },
    ruleKind: {
      type: DataTypes.ENUM('weekly_work', 'weekly_break', 'weekday_lunch', 'date_off', 'date_break'),
      allowNull: false,
    },
    weekday: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
    dateIso: { type: DataTypes.DATEONLY, allowNull: true },
    timeStart: { type: DataTypes.STRING(5), allowNull: true },
    timeEnd: { type: DataTypes.STRING(5), allowNull: true },
    allDay: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { sequelize, tableName: 'instructor_availability_blocks', modelName: 'InstructorAvailabilityBlock' },
);
