import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt } from './auto-id';
import type { AccountType } from './user.model';

export const NOTIFICATION_TYPES = [
  'BOOKING_CREATED',
  'BOOKING_UPDATED',
  'BOOKING_CANCELLED',
  'BOOKING_REQUEST_CREATED',
  'LESSON_UPCOMING',
  'CONTACT_REQUEST_CREATED',
  'CALL_REQUEST_CREATED',
  'PAYMENT_RECEIVED',
  'SYSTEM_ALERT',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_ENTITY_TYPES = [
  'booking',
  'theory_cohort',
  'contact_request',
  'booked_call',
  'finance_transaction',
  'system',
] as const;

export type NotificationEntityType = (typeof NOTIFICATION_ENTITY_TYPES)[number];

export class Notification extends Model<InferAttributes<Notification>, InferCreationAttributes<Notification>> {
  declare id: CreationOptional<number>;
  declare recipientUserId: number;
  declare recipientRole: AccountType;
  declare type: NotificationType;
  declare title: string;
  declare message: string;
  declare entityType: NotificationEntityType;
  declare entityId: CreationOptional<string | null>;
  declare metadata: CreationOptional<Record<string, unknown> | null>;
  declare dedupeKey: CreationOptional<string | null>;
  declare isRead: CreationOptional<boolean>;
  declare readAt: CreationOptional<Date | null>;
}

Notification.init(
  {
    id: autoIncrementPk(),
    recipientUserId: fkUnsignedInt(),
    recipientRole: {
      type: DataTypes.ENUM('super_admin', 'admin', 'instructor', 'student'),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(...NOTIFICATION_TYPES),
      allowNull: false,
    },
    title: { type: DataTypes.STRING(255), allowNull: false },
    message: { type: DataTypes.STRING(1000), allowNull: false },
    entityType: {
      type: DataTypes.ENUM(...NOTIFICATION_ENTITY_TYPES),
      allowNull: false,
      defaultValue: 'system',
    },
    entityId: { type: DataTypes.STRING(64), allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
    dedupeKey: { type: DataTypes.STRING(255), allowNull: true, unique: true },
    isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    readAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: 'notifications',
    modelName: 'Notification',
    indexes: [
      { fields: ['recipient_user_id', 'is_read', 'created_at'] },
      { fields: ['recipient_user_id', 'created_at'] },
      { fields: ['type'] },
    ],
  },
);
