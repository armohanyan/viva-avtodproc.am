import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedIntNullable } from './auto-id';

export class DirectorSalary extends Model<
  InferAttributes<DirectorSalary>,
  InferCreationAttributes<DirectorSalary>
> {
  declare id: CreationOptional<number>;
  declare date: string;
  declare name: string;
  declare role: string;
  declare hours: CreationOptional<number | null>;
  declare hourlyRate: CreationOptional<number | null>;
  declare totalAmd: number;
  declare comment: CreationOptional<string | null>;
  declare createdByUserId: CreationOptional<number | null>;
}

DirectorSalary.init(
  {
    id: autoIncrementPk(),
    date: { type: DataTypes.DATEONLY, allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.STRING(255), allowNull: false },
    hours: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: null },
    hourlyRate: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null },
    totalAmd: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    comment: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    createdByUserId: fkUnsignedIntNullable(),
  },
  {
    sequelize,
    tableName: 'director_salaries',
    modelName: 'DirectorSalary',
    timestamps: true,
    underscored: true,
  },
);
