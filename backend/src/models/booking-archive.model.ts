import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt, fkUnsignedIntNullable } from './auto-id';

export type BookingArchiveKind = 'booking' | 'slot';

/**
 * Staff archive of removed bookings / slots.
 * Calendar claims are freed; this row keeps who removed it, why, and a snapshot for audit.
 */
export class BookingArchive extends Model<
  InferAttributes<BookingArchive>,
  InferCreationAttributes<BookingArchive>
> {
  declare id: CreationOptional<number>;
  declare kind: BookingArchiveKind;
  /** Original booking id when still present (nullable after permanent purge of the booking). */
  declare bookingId: CreationOptional<number | null>;
  declare remark: string;
  declare archivedByUserId: number;
  declare branchId: CreationOptional<number | null>;
  declare branchName: CreationOptional<string | null>;
  declare studentUserId: CreationOptional<number | null>;
  declare studentName: CreationOptional<string | null>;
  declare instructorUserId: CreationOptional<number | null>;
  declare instructorName: CreationOptional<string | null>;
  declare lessonType: CreationOptional<string | null>;
  declare dateIso: CreationOptional<string | null>;
  declare time: CreationOptional<string | null>;
  declare endTime: CreationOptional<string | null>;
  /** Slot removed (kind=slot). */
  declare slotDateIso: CreationOptional<string | null>;
  declare slotTime: CreationOptional<string | null>;
  declare totalPriceAmd: CreationOptional<number | null>;
  declare paymentStatus: CreationOptional<string | null>;
  declare paidAmountAmd: CreationOptional<number | null>;
  declare bookingStatusBefore: CreationOptional<string | null>;
  declare snapshot: CreationOptional<Record<string, unknown> | null>;
}

BookingArchive.init(
  {
    id: autoIncrementPk(),
    kind: { type: DataTypes.STRING(16), allowNull: false },
    bookingId: fkUnsignedIntNullable(),
    remark: { type: DataTypes.TEXT, allowNull: false },
    archivedByUserId: fkUnsignedInt(),
    branchId: fkUnsignedIntNullable(),
    branchName: { type: DataTypes.STRING(255), allowNull: true },
    studentUserId: fkUnsignedIntNullable(),
    studentName: { type: DataTypes.STRING(255), allowNull: true },
    instructorUserId: fkUnsignedIntNullable(),
    instructorName: { type: DataTypes.STRING(255), allowNull: true },
    lessonType: { type: DataTypes.STRING(32), allowNull: true },
    dateIso: { type: DataTypes.DATEONLY, allowNull: true },
    time: { type: DataTypes.STRING(16), allowNull: true },
    endTime: { type: DataTypes.STRING(16), allowNull: true },
    slotDateIso: { type: DataTypes.DATEONLY, allowNull: true },
    slotTime: { type: DataTypes.STRING(16), allowNull: true },
    totalPriceAmd: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    paymentStatus: { type: DataTypes.STRING(16), allowNull: true },
    paidAmountAmd: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    bookingStatusBefore: { type: DataTypes.STRING(32), allowNull: true },
    snapshot: { type: DataTypes.JSON, allowNull: true },
  },
  { sequelize, tableName: 'booking_archives', modelName: 'BookingArchive' },
);
