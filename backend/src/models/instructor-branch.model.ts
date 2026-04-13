import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';

/** Instructor (user) ↔ branch M:N */
export class InstructorBranch extends Model<
  InferAttributes<InstructorBranch>,
  InferCreationAttributes<InstructorBranch>
> {
  declare instructorUserId: string;
  declare branchId: string;
}

InstructorBranch.init(
  {
    instructorUserId: { type: DataTypes.STRING(64), primaryKey: true },
    branchId: { type: DataTypes.STRING(64), primaryKey: true },
  },
  { sequelize, tableName: 'instructor_branches', modelName: 'InstructorBranch' },
);
