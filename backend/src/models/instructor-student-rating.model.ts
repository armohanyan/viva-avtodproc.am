import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt } from './auto-id';

export class InstructorStudentRating extends Model<
  InferAttributes<InstructorStudentRating>,
  InferCreationAttributes<InstructorStudentRating>
> {
  declare id: CreationOptional<number>;
  declare studentUserId: number;
  declare instructorUserId: number;
  declare stars: number;
}

InstructorStudentRating.init(
  {
    id: autoIncrementPk(),
    studentUserId: fkUnsignedInt(),
    instructorUserId: fkUnsignedInt(),
    stars: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  },
  {
    sequelize,
    tableName: 'instructor_student_ratings',
    modelName: 'InstructorStudentRating',
    indexes: [{ unique: true, fields: ['student_user_id', 'instructor_user_id'] }],
  },
);
