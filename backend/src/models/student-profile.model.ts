import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { fkUnsignedInt, fkUnsignedIntNullable } from './auto-id';

/** One profile per student user — legacy schema uses `user_id` as the primary key (no surrogate `id`). */
export class StudentProfile extends Model<
  InferAttributes<StudentProfile>,
  InferCreationAttributes<StudentProfile>
> {
  declare userId: number;
  declare branchId: number;
  declare packageId: CreationOptional<number | null>;
  declare instructorUserId: CreationOptional<number | null>;
  declare lessonsCompleted: number;
  declare lessonsTotal: number;
  declare enrollmentStatus: string;
  declare skillRating: number;
  declare licenseAchieved: boolean;
  declare joinedAt: string;
}

StudentProfile.init(
  {
    userId: { ...fkUnsignedInt(), primaryKey: true },
    branchId: fkUnsignedInt(),
    packageId: fkUnsignedIntNullable(),
    instructorUserId: fkUnsignedIntNullable(),
    lessonsCompleted: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    lessonsTotal: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    enrollmentStatus: { type: DataTypes.STRING(32), allowNull: false },
    skillRating: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    licenseAchieved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    joinedAt: { type: DataTypes.DATEONLY, allowNull: false },
  },
  { sequelize, tableName: 'student_profiles', modelName: 'StudentProfile' },
);
