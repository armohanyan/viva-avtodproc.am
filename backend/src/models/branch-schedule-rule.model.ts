import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt } from './auto-id';

/** 1 = Mon … 7 = Sun. */
export type BranchScheduleRuleKind = 'work_hours' | 'day_off';

/**
 * Branch operating hours for lesson booking slots.
 * - `work_hours` — weekly window when the branch accepts bookings.
 * - `day_off` — specific calendar day fully or partially closed.
 */
export class BranchScheduleRule extends Model<
  InferAttributes<BranchScheduleRule>,
  InferCreationAttributes<BranchScheduleRule>
> {
  declare id: CreationOptional<number>;
  declare branchId: number;
  declare ruleKind: BranchScheduleRuleKind;
  declare weekday: CreationOptional<number | null>;
  declare dateIso: CreationOptional<string | null>;
  declare timeStart: CreationOptional<string | null>;
  declare timeEnd: CreationOptional<string | null>;
  declare allDay: CreationOptional<boolean>;
}

BranchScheduleRule.init(
  {
    id: autoIncrementPk(),
    branchId: fkUnsignedInt(),
    ruleKind: {
      type: DataTypes.ENUM('work_hours', 'day_off'),
      allowNull: false,
    },
    weekday: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
    dateIso: { type: DataTypes.DATEONLY, allowNull: true },
    timeStart: { type: DataTypes.STRING(5), allowNull: true },
    timeEnd: { type: DataTypes.STRING(5), allowNull: true },
    allDay: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { sequelize, tableName: 'branch_schedule_rules', modelName: 'BranchScheduleRule' },
);
