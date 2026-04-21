import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk } from './auto-id';

export type AccountType = 'super_admin' | 'admin' | 'instructor' | 'student';

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<number>;
  declare email: string;
  declare passwordHash: CreationOptional<string | null>;
  declare name: string;
  declare accountType: AccountType;
  declare phone: CreationOptional<string | null>;
  declare isActive: CreationOptional<boolean>;
  /** SHA-256 hex of opaque reset token; plain token only in email. */
  declare passwordResetTokenHash: CreationOptional<string | null>;
  declare passwordResetExpiresAt: CreationOptional<Date | null>;
}

User.init(
  {
    id: autoIncrementPk(),
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    accountType: {
      type: DataTypes.ENUM('super_admin', 'admin', 'instructor', 'student'),
      allowNull: false,
    },
    phone: { type: DataTypes.STRING(64), allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    passwordResetTokenHash: { type: DataTypes.STRING(128), allowNull: true },
    passwordResetExpiresAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, tableName: 'users', modelName: 'User' },
);
