import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';

/** One row per student — JSON payload mirrors client `exam.tests.stats.v2` shape. */
export class StudentExamStats extends Model<
  InferAttributes<StudentExamStats>,
  InferCreationAttributes<StudentExamStats>
> {
  declare userId: number;
  declare payload: Record<string, unknown>;
}

StudentExamStats.init(
  {
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      allowNull: false,
      field: 'user_id',
    },
    payload: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
  },
  {
    sequelize,
    tableName: 'student_exam_stats',
    modelName: 'StudentExamStats',
    timestamps: false,
    underscored: true,
  },
);
