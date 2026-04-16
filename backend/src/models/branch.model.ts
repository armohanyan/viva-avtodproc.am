import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt } from './auto-id';

export class Branch extends Model<InferAttributes<Branch>, InferCreationAttributes<Branch>> {
  declare id: CreationOptional<number>;
  declare cityId: number;
  declare name: string;
  declare mapUrl: string;
  declare phone: CreationOptional<string | null>;
  declare email: CreationOptional<string | null>;
  declare workHours: CreationOptional<string | null>;
}

Branch.init(
  {
    id: autoIncrementPk(),
    cityId: fkUnsignedInt(),
    name: { type: DataTypes.STRING(512), allowNull: false },
    mapUrl: { type: DataTypes.TEXT, allowNull: false },
    phone: { type: DataTypes.STRING(64), allowNull: true },
    email: { type: DataTypes.STRING(255), allowNull: true },
    workHours: { type: DataTypes.STRING(255), allowNull: true },
  },
  { sequelize, tableName: 'branches', modelName: 'Branch' },
);
