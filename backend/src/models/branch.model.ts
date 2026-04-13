import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';

export class Branch extends Model<InferAttributes<Branch>, InferCreationAttributes<Branch>> {
  declare id: string;
  declare cityId: string;
  declare name: string;
  declare mapUrl: string;
  declare phone: CreationOptional<string | null>;
  declare email: CreationOptional<string | null>;
  declare workHours: CreationOptional<string | null>;
}

Branch.init(
  {
    id: { type: DataTypes.STRING(64), primaryKey: true },
    cityId: { type: DataTypes.STRING(64), allowNull: false },
    name: { type: DataTypes.STRING(512), allowNull: false },
    mapUrl: { type: DataTypes.TEXT, allowNull: false },
    phone: { type: DataTypes.STRING(64), allowNull: true },
    email: { type: DataTypes.STRING(255), allowNull: true },
    workHours: { type: DataTypes.STRING(255), allowNull: true },
  },
  { sequelize, tableName: 'branches', modelName: 'Branch' },
);
