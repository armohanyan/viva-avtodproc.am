import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { fkUnsignedInt } from './auto-id';

/** One profile per instructor user — legacy schema uses `user_id` as the primary key (no surrogate `id`). */
export class InstructorProfile extends Model<
  InferAttributes<InstructorProfile>,
  InferCreationAttributes<InstructorProfile>
> {
  declare userId: number;
  declare years: number;
  declare rating: number;
  declare hourlyPrice: number;
  /** AMD paid to this instructor per practical lesson hour. */
  declare practicalSalaryPerLessonAmd: number;
  /** AMD paid to this instructor per group-theory session. */
  declare theorySalaryPerLessonAmd: number;
  declare imageSrc: string;
  declare teachesPractical: boolean;
  declare teachesTheory: boolean;
  declare status: 'active' | 'inactive';
}

InstructorProfile.init(
  {
    userId: { ...fkUnsignedInt(), primaryKey: true },
    years: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    rating: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 5 },
    hourlyPrice: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    practicalSalaryPerLessonAmd: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1500,
    },
    theorySalaryPerLessonAmd: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 3000,
    },
    imageSrc: { type: DataTypes.STRING(512), allowNull: false },
    teachesPractical: { type: DataTypes.BOOLEAN, allowNull: false },
    teachesTheory: { type: DataTypes.BOOLEAN, allowNull: false },
    status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: false },
  },
  { sequelize, tableName: 'instructor_profiles', modelName: 'InstructorProfile' },
);
