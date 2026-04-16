import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk } from './auto-id';

export type BookedCallStatus = 'pending' | 'contacted' | 'cancelled';

export class BookedCall extends Model<InferAttributes<BookedCall>, InferCreationAttributes<BookedCall>> {
  declare id: CreationOptional<number>;
  declare name: CreationOptional<string | null>;
  declare phone: string;
  declare preferredTimeSlot: string;
  declare notes: CreationOptional<string | null>;
  declare status: BookedCallStatus;
}

BookedCall.init(
  {
    id: autoIncrementPk(),
    name: { type: DataTypes.STRING(255), allowNull: true },
    phone: { type: DataTypes.STRING(64), allowNull: false },
    preferredTimeSlot: { type: DataTypes.TEXT, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'pending',
    },
  },
  { sequelize, tableName: 'booked_calls', modelName: 'BookedCall', timestamps: true },
);
