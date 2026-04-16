import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt } from './auto-id';

export class StudentExtraPractical extends Model<
  InferAttributes<StudentExtraPractical>,
  InferCreationAttributes<StudentExtraPractical>
> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare practicalTotal: number;
  declare practicalUsed: number;
  declare purchasedAt: string;
}

StudentExtraPractical.init(
  {
    id: autoIncrementPk(),
    userId: fkUnsignedInt(),
    practicalTotal: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    practicalUsed: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    purchasedAt: { type: DataTypes.DATEONLY, allowNull: false },
  },
  { sequelize, tableName: 'student_extra_practicals', modelName: 'StudentExtraPractical' },
);
