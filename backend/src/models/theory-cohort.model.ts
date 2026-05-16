import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt } from './auto-id';

export class TheoryCohort extends Model<InferAttributes<TheoryCohort>, InferCreationAttributes<TheoryCohort>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare startDateIso: string;
  declare endDateIso: string;
  declare seats: number;
  declare instructorName: string;
  declare meetLink: string;
  declare status: string;
  declare branchId: number;
  /** Local clock time (HH:MM) when the recurring theory session usually starts, optional. */
  declare sessionStartTime: string | null;
  /** Local clock time (HH:MM) when the session usually ends, optional. */
  declare sessionEndTime: string | null;
  /** Fixed course price for the group (AMD). When null, booking total falls back to instructor hourly × slot hours. */
  declare priceAmd: CreationOptional<number | null>;
  /** Comma-separated weekday indices Mon=0 … Sun=6. */
  declare lessonWeekdays: string;
  /** Planned number of class sessions to generate. */
  declare totalLessons: number;
  /** Resolved instructor user id for sessions and calendar. */
  declare instructorUserId: number | null;
}

TheoryCohort.init(
  {
    id: autoIncrementPk(),
    name: { type: DataTypes.STRING(255), allowNull: false },
    startDateIso: { type: DataTypes.DATEONLY, allowNull: false },
    endDateIso: { type: DataTypes.DATEONLY, allowNull: false },
    seats: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    instructorName: { type: DataTypes.STRING(255), allowNull: false },
    meetLink: { type: DataTypes.STRING(512), allowNull: false, defaultValue: '' },
    status: { type: DataTypes.STRING(32), allowNull: false },
    branchId: fkUnsignedInt(),
    sessionStartTime: { type: DataTypes.STRING(5), allowNull: true, defaultValue: null },
    sessionEndTime: { type: DataTypes.STRING(5), allowNull: true, defaultValue: null },
    priceAmd: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null },
    lessonWeekdays: { type: DataTypes.STRING(32), allowNull: false, defaultValue: '' },
    totalLessons: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    instructorUserId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null },
  },
  { sequelize, tableName: 'theory_cohorts', modelName: 'TheoryCohort' },
);
