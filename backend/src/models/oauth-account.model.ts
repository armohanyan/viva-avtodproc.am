import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt } from './auto-id';

export type OAuthProvider = 'google' | 'facebook' | 'apple';

export class OAuthAccount extends Model<InferAttributes<OAuthAccount>, InferCreationAttributes<OAuthAccount>> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare provider: OAuthProvider;
  declare providerUserId: string;
  declare createdAt: CreationOptional<Date>;
}

OAuthAccount.init(
  {
    id: autoIncrementPk(),
    userId: { ...fkUnsignedInt(), field: 'user_id' },
    provider: {
      type: DataTypes.ENUM('google', 'facebook', 'apple'),
      allowNull: false,
    },
    providerUserId: { type: DataTypes.STRING(255), allowNull: false, field: 'provider_user_id' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
  },
  {
    sequelize,
    tableName: 'oauth_accounts',
    modelName: 'OAuthAccount',
    updatedAt: false,
    indexes: [{ unique: true, fields: ['provider', 'provider_user_id'] }],
  },
);
