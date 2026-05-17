import { Model, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { fkUnsignedInt } from './auto-id';

/** Theory cohort ↔ instructor M:N — PK is `(cohort_id, instructor_user_id)`. */
export class TheoryCohortInstructor extends Model<
  InferAttributes<TheoryCohortInstructor>,
  InferCreationAttributes<TheoryCohortInstructor>
> {
  declare cohortId: number;
  declare instructorUserId: number;
}

TheoryCohortInstructor.init(
  {
    cohortId: { ...fkUnsignedInt(), primaryKey: true },
    instructorUserId: { ...fkUnsignedInt(), primaryKey: true },
  },
  { sequelize, tableName: 'theory_cohort_instructors', modelName: 'TheoryCohortInstructor' },
);
