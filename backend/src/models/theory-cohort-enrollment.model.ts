import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';

export class TheoryCohortEnrollment extends Model<
  InferAttributes<TheoryCohortEnrollment>,
  InferCreationAttributes<TheoryCohortEnrollment>
> {
  declare cohortId: string;
  declare studentUserId: string;
}

TheoryCohortEnrollment.init(
  {
    cohortId: { type: DataTypes.STRING(64), primaryKey: true },
    studentUserId: { type: DataTypes.STRING(64), primaryKey: true },
  },
  { sequelize, tableName: 'theory_cohort_enrollments', modelName: 'TheoryCohortEnrollment' },
);
