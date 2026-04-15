import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';

export class InstructorStudentRating extends Model<
  InferAttributes<InstructorStudentRating>,
  InferCreationAttributes<InstructorStudentRating>
> {
  declare studentUserId: string;
  declare instructorUserId: string;
  declare stars: number;
}

InstructorStudentRating.init(
  {
    studentUserId: { type: DataTypes.STRING(64), primaryKey: true },
    instructorUserId: { type: DataTypes.STRING(64), primaryKey: true },
    stars: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  },
  { sequelize, tableName: 'instructor_student_ratings', modelName: 'InstructorStudentRating' },
);
