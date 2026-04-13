import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';

export class StudentExtraPractical extends Model<
  InferAttributes<StudentExtraPractical>,
  InferCreationAttributes<StudentExtraPractical>
> {
  declare id: string;
  declare userId: string;
  declare practicalTotal: number;
  declare practicalUsed: number;
  declare purchasedAt: string;
}

StudentExtraPractical.init(
  {
    id: { type: DataTypes.STRING(64), primaryKey: true },
    userId: { type: DataTypes.STRING(64), allowNull: false },
    practicalTotal: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    practicalUsed: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    purchasedAt: { type: DataTypes.DATEONLY, allowNull: false },
  },
  { sequelize, tableName: 'student_extra_practicals', modelName: 'StudentExtraPractical' },
);
