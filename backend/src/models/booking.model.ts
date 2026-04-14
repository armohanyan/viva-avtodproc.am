import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';

export class Booking extends Model<InferAttributes<Booking>, InferCreationAttributes<Booking>> {
  declare id: string;
  declare studentUserId: string;
  declare instructorUserId: string;
  declare branchId: string;
  declare dateIso: string;
  declare time: string;
  declare lessonType: 'practical' | 'theory';
  declare status: string;
  /** Set when payment is captured (practical / personal flows). */
  declare paidAt: CreationOptional<Date | null>;
  /** When `status === pending_payment`, unpaid holds expire and the slot is released. */
  declare holdExpiresAt: CreationOptional<Date | null>;
}

Booking.init(
  {
    id: { type: DataTypes.STRING(64), primaryKey: true },
    studentUserId: { type: DataTypes.STRING(64), allowNull: false },
    instructorUserId: { type: DataTypes.STRING(64), allowNull: false },
    branchId: { type: DataTypes.STRING(64), allowNull: false },
    dateIso: { type: DataTypes.DATEONLY, allowNull: false },
    time: { type: DataTypes.STRING(16), allowNull: false },
    lessonType: { type: DataTypes.ENUM('practical', 'theory'), allowNull: false },
    status: { type: DataTypes.STRING(32), allowNull: false },
    paidAt: { type: DataTypes.DATE, allowNull: true },
    holdExpiresAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, tableName: 'bookings', modelName: 'Booking' },
);
