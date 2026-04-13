import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';

export class StudentProfile extends Model<
  InferAttributes<StudentProfile>,
  InferCreationAttributes<StudentProfile>
> {
  declare userId: string;
  declare branchId: string;
  declare packageId: string;
  declare instructorUserId: CreationOptional<string | null>;
  declare lessonsCompleted: number;
  declare lessonsTotal: number;
  declare enrollmentStatus: string;
  declare skillRating: number;
  declare licenseAchieved: boolean;
  declare joinedAt: string;
}

StudentProfile.init(
  {
    userId: { type: DataTypes.STRING(64), primaryKey: true },
    branchId: { type: DataTypes.STRING(64), allowNull: false },
    packageId: { type: DataTypes.STRING(64), allowNull: false },
    instructorUserId: { type: DataTypes.STRING(64), allowNull: true },
    lessonsCompleted: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    lessonsTotal: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    enrollmentStatus: { type: DataTypes.STRING(32), allowNull: false },
    skillRating: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    licenseAchieved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    joinedAt: { type: DataTypes.DATEONLY, allowNull: false },
  },
  { sequelize, tableName: 'student_profiles', modelName: 'StudentProfile' },
);
