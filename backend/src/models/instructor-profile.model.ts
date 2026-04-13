import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';

export class InstructorProfile extends Model<
  InferAttributes<InstructorProfile>,
  InferCreationAttributes<InstructorProfile>
> {
  declare userId: string;
  declare years: number;
  declare rating: number;
  declare hourlyPrice: number;
  declare schedule: string;
  declare location: string;
  declare carLabel: string;
  declare transmission: string;
  declare imageSrc: string;
  declare teachesPractical: boolean;
  declare teachesTheory: boolean;
  declare status: 'active' | 'inactive';
}

InstructorProfile.init(
  {
    userId: { type: DataTypes.STRING(64), primaryKey: true },
    years: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    rating: { type: DataTypes.FLOAT, allowNull: false },
    hourlyPrice: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    schedule: { type: DataTypes.STRING(128), allowNull: false },
    location: { type: DataTypes.STRING(128), allowNull: false },
    carLabel: { type: DataTypes.STRING(255), allowNull: false },
    transmission: { type: DataTypes.STRING(64), allowNull: false },
    imageSrc: { type: DataTypes.STRING(512), allowNull: false },
    teachesPractical: { type: DataTypes.BOOLEAN, allowNull: false },
    teachesTheory: { type: DataTypes.BOOLEAN, allowNull: false },
    status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: false },
  },
  { sequelize, tableName: 'instructor_profiles', modelName: 'InstructorProfile' },
);
