    import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt } from './auto-id';

/** A single scheduled group-theory class occurrence for a cohort. */
export class TheoryCohortSession extends Model<
  InferAttributes<TheoryCohortSession>,
  InferCreationAttributes<TheoryCohortSession>
> {
  declare id: CreationOptional<number>;
  declare cohortId: number;
  declare branchId: number;
  declare instructorUserId: number | null;
  declare dateIso: string;
  declare startTime: string;
  declare endTime: string;
  /** 1-based order within the cohort schedule. */
  declare lessonIndex: number;
  declare status: string;
}

TheoryCohortSession.init(
  {
    id: autoIncrementPk(),
    cohortId: fkUnsignedInt(),
    branchId: fkUnsignedInt(),
    instructorUserId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null },
    dateIso: { type: DataTypes.DATEONLY, allowNull: false },
    startTime: { type: DataTypes.STRING(5), allowNull: false },
    endTime: { type: DataTypes.STRING(5), allowNull: false },
    lessonIndex: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'scheduled' },
  },
  {
    sequelize,
    tableName: 'theory_cohort_sessions',
    modelName: 'TheoryCohortSession',
    indexes: [
      { unique: true, fields: ['cohort_id', 'date_iso', 'start_time'], name: 'uq_theory_cohort_session_slot' },
      { fields: ['cohort_id', 'lesson_index'], name: 'idx_theory_cohort_session_order' },
      { fields: ['date_iso'], name: 'idx_theory_cohort_session_date' },
      { fields: ['branch_id', 'date_iso'], name: 'idx_theory_cohort_session_branch_date' },
      { fields: ['instructor_user_id', 'date_iso'], name: 'idx_theory_cohort_session_instructor_date' },
    ],
  },
);
