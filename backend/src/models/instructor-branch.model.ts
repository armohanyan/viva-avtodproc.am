import { Model, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { fkUnsignedInt } from './auto-id';

/** Instructor (user) ↔ branch M:N — legacy table has no surrogate `id`; PK is `(instructor_user_id, branch_id)`. */
export class InstructorBranch extends Model<
  InferAttributes<InstructorBranch>,
  InferCreationAttributes<InstructorBranch>
> {
  declare instructorUserId: number;
  declare branchId: number;
}

InstructorBranch.init(
  {
    instructorUserId: { ...fkUnsignedInt(), primaryKey: true },
    branchId: { ...fkUnsignedInt(), primaryKey: true },
  },
  { sequelize, tableName: 'instructor_branches', modelName: 'InstructorBranch' },
);
