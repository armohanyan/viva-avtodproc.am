import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt } from './auto-id';

export class Booking extends Model<InferAttributes<Booking>, InferCreationAttributes<Booking>> {
  declare id: CreationOptional<number>;
  declare studentUserId: number;
  declare instructorUserId: number;
  declare branchId: number;
  declare dateIso: string;
  /** Start of the first hour (HH:MM), same calendar day as {@link dateIso}. */
  declare time: string;
  /** Exclusive end time (HH:MM) on the same calendar day, e.g. slots 09:00+10:00 → endTime 11:00. Null = legacy single-hour row (`time` only). */
  declare endTime: CreationOptional<string | null>;
  /** Total price in AMD (hourly rate × number of hours). */
  declare totalPriceAmd: CreationOptional<number | null>;
  declare lessonType: 'practical' | 'theory' | 'theory_personal';
  declare status: string;
  /** Set when payment is captured (practical / personal flows). */
  declare paidAt: CreationOptional<Date | null>;
  /**
   * When `status === pending` and this is set, unpaid payment sessions expire and the slot is released (→ cancelled).
   * `null` means no active payment window (e.g. reserved pending, not yet in the pay-horizon flow).
   */
  declare holdExpiresAt: CreationOptional<Date | null>;
}

Booking.init(
  {
    id: autoIncrementPk(),
    studentUserId: fkUnsignedInt(),
    instructorUserId: fkUnsignedInt(),
    branchId: fkUnsignedInt(),
    dateIso: { type: DataTypes.DATEONLY, allowNull: false },
    time: { type: DataTypes.STRING(16), allowNull: false },
    endTime: { type: DataTypes.STRING(16), allowNull: true },
    totalPriceAmd: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    lessonType: { type: DataTypes.ENUM('practical', 'theory', 'theory_personal'), allowNull: false },
    status: { type: DataTypes.STRING(32), allowNull: false },
    paidAt: { type: DataTypes.DATE, allowNull: true },
    holdExpiresAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, tableName: 'bookings', modelName: 'Booking' },
);
