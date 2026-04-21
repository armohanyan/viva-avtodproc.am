import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt } from './auto-id';

export class AdminMfaChallenge extends Model<
  InferAttributes<AdminMfaChallenge>,
  InferCreationAttributes<AdminMfaChallenge>
> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare codeHash: string;
  declare expiresAt: Date;
  declare consumedAt: CreationOptional<Date | null>;
}

AdminMfaChallenge.init(
  {
    id: autoIncrementPk(),
    userId: fkUnsignedInt(),
    codeHash: { type: DataTypes.STRING(128), allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    consumedAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, tableName: 'admin_mfa_challenges', modelName: 'AdminMfaChallenge' },
);
