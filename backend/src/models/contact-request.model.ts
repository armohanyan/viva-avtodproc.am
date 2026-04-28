import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk } from './auto-id';

export type ContactRequestStatus = 'active' | 'archived';

export class ContactRequest extends Model<InferAttributes<ContactRequest>, InferCreationAttributes<ContactRequest>> {
  declare id: CreationOptional<number>;
  declare firstName: string;
  declare lastName: CreationOptional<string | null>;
  declare email: string;
  declare phone: CreationOptional<string | null>;
  declare subject: CreationOptional<string | null>;
  declare message: string;
  declare status: ContactRequestStatus;
}

ContactRequest.init(
  {
    id: autoIncrementPk(),
    firstName: { type: DataTypes.STRING(255), allowNull: false },
    lastName: { type: DataTypes.STRING(255), allowNull: true },
    email: { type: DataTypes.STRING(255), allowNull: false },
    phone: { type: DataTypes.STRING(64), allowNull: true },
    subject: { type: DataTypes.STRING(255), allowNull: true },
    message: { type: DataTypes.TEXT, allowNull: false },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'active',
    },
  },
  { sequelize, tableName: 'contact_requests', modelName: 'ContactRequest', timestamps: true },
);
