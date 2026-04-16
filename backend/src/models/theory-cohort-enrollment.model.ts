import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt } from './auto-id';

export class TheoryCohortEnrollment extends Model<
  InferAttributes<TheoryCohortEnrollment>,
  InferCreationAttributes<TheoryCohortEnrollment>
> {
  declare id: CreationOptional<number>;
  declare cohortId: number;
  declare studentUserId: number;
}

TheoryCohortEnrollment.init(
  {
    id: autoIncrementPk(),
    cohortId: fkUnsignedInt(),
    studentUserId: fkUnsignedInt(),
  },
  {
    sequelize,
    tableName: 'theory_cohort_enrollments',
    modelName: 'TheoryCohortEnrollment',
    indexes: [{ unique: true, fields: ['cohort_id', 'student_user_id'] }],
  },
);
