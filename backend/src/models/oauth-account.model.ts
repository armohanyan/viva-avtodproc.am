import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../database/sequelize';

export type OAuthProvider = 'google' | 'facebook' | 'apple';

export class OAuthAccount extends Model<InferAttributes<OAuthAccount>, InferCreationAttributes<OAuthAccount>> {
  declare id: string;
  declare userId: string;
  declare provider: OAuthProvider;
  declare providerUserId: string;
  declare createdAt: CreationOptional<Date>;
}

OAuthAccount.init(
  {
    id: { type: DataTypes.STRING(64), primaryKey: true },
    userId: { type: DataTypes.STRING(64), allowNull: false, field: 'user_id' },
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
