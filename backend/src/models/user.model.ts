import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../database/sequelize';

export type AccountType = 'super_admin' | 'admin' | 'instructor' | 'student';

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: string;
  declare email: string;
  declare passwordHash: CreationOptional<string | null>;
  declare name: string;
  declare accountType: AccountType;
  declare phone: CreationOptional<string | null>;
  declare isActive: CreationOptional<boolean>;
}

User.init(
  {
    id: { type: DataTypes.STRING(64), primaryKey: true },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    accountType: {
      type: DataTypes.ENUM('super_admin', 'admin', 'instructor', 'student'),
      allowNull: false,
    },
    phone: { type: DataTypes.STRING(64), allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { sequelize, tableName: 'users', modelName: 'User' },
);
