import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt, fkUnsignedIntNullable } from './auto-id';

export class Booking extends Model<InferAttributes<Booking>, InferCreationAttributes<Booking>> {
  declare id: CreationOptional<number>;
  declare studentUserId: number;
  /** Null when the instructor user was removed; booking history is retained. */
  declare instructorUserId: CreationOptional<number | null>;
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
  /** How many times the student used “Add 5 more minutes” for this booking (server-enforced max). */
  declare holdExtensionCount: CreationOptional<number>;
  /** When a booking confirmation email was sent (at most once per booking). */
  declare confirmationEmailSentAt: CreationOptional<Date | null>;
  /** Student asked to cancel ≥24h before lesson; staff must confirm and process refund. */
  declare cancellationRequestedAt: CreationOptional<Date | null>;
  /**
   * Whether the lesson actually ran successfully (`true` / `false`), or not yet recorded (`null`).
   * Instructors (assigned booking) and staff (admin / super_admin) may update the same field.
   */
  declare lessonPassedSuccessfully: CreationOptional<boolean | null>;
  /**
   * Lesson delivery lifecycle (`scheduled`, `completed`, `missed`, …) — separate from booking `status`.
   */
  declare lessonCompletionStatus: CreationOptional<string | null>;
  /** When the lesson was marked completed or missed (auto or manual). */
  declare lessonCompletedAt: CreationOptional<Date | null>;
  /** Package / extra practical credits used for this booking; restored on cancellation. */
  declare prepaidMeta: CreationOptional<Record<string, unknown> | null>;
  /**
   * Payment lifecycle for student bookings (`paid` after capture). Nullable on legacy/admin rows.
   * Admin manual bookings may use `partial` for մասնակի վճարում.
   */
  declare paymentStatus: CreationOptional<'paid' | 'unpaid' | 'partial' | 'pending' | 'failed' | null>;
  /** Amount already paid toward {@link totalPriceAmd} (admin-recorded or inferred from legacy data). */
  declare paidAmountAmd: CreationOptional<number | null>;
  /** First calendar day when pay-at-booking-time applies (student must complete payment). */
  declare paymentRequiredAt: CreationOptional<string | null>;
  /** When the “payment due soon” email + notification were sent (dedupe). */
  declare paymentReminderSentAt: CreationOptional<Date | null>;
  /** Admin notes about payment (cash, promise to pay, etc.). */
  declare paymentNotes: CreationOptional<string | null>;
  /** When to send debt payment reminder (defaults to date at 22:00 Yerevan if only date set). */
  declare paymentReminderAt: CreationOptional<Date | null>;
  /** When the system cancelled the booking for missed payment (auto-cancel path). */
  declare autoCancelledAt: CreationOptional<Date | null>;
  /** Structured reason for cancellation when applicable (e.g. missed payment deadline). */
  declare cancellationReason: CreationOptional<string | null>;
  /** Online meeting URL for personal theory lessons (`theory_personal`). */
  declare meetLink: CreationOptional<string | null>;
  /** Who created the booking: student self-service, admin panel, or unknown (legacy). */
  declare createdByType: CreationOptional<'student' | 'admin' | 'unknown'>;
  /** User id of the creator (student or staff admin) when known. */
  declare createdByUserId: CreationOptional<number | null>;
}

Booking.init(
  {
    id: autoIncrementPk(),
    studentUserId: fkUnsignedInt(),
    instructorUserId: fkUnsignedIntNullable(),
    branchId: fkUnsignedInt(),
    dateIso: { type: DataTypes.DATEONLY, allowNull: false },
    time: { type: DataTypes.STRING(16), allowNull: false },
    endTime: { type: DataTypes.STRING(16), allowNull: true },
    totalPriceAmd: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    lessonType: { type: DataTypes.ENUM('practical', 'theory', 'theory_personal'), allowNull: false },
    status: { type: DataTypes.STRING(32), allowNull: false },
    paidAt: { type: DataTypes.DATE, allowNull: true },
    holdExpiresAt: { type: DataTypes.DATE, allowNull: true },
    holdExtensionCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    confirmationEmailSentAt: { type: DataTypes.DATE, allowNull: true },
    cancellationRequestedAt: { type: DataTypes.DATE, allowNull: true },
    lessonPassedSuccessfully: { type: DataTypes.BOOLEAN, allowNull: true },
    lessonCompletionStatus: { type: DataTypes.STRING(32), allowNull: true, defaultValue: 'scheduled' },
    lessonCompletedAt: { type: DataTypes.DATE, allowNull: true },
    prepaidMeta: { type: DataTypes.JSON, allowNull: true },
    paymentStatus: { type: DataTypes.STRING(16), allowNull: true },
    paidAmountAmd: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    paymentRequiredAt: { type: DataTypes.DATEONLY, allowNull: true },
    paymentReminderSentAt: { type: DataTypes.DATE, allowNull: true },
    paymentNotes: { type: DataTypes.TEXT, allowNull: true },
    paymentReminderAt: { type: DataTypes.DATE, allowNull: true },
    autoCancelledAt: { type: DataTypes.DATE, allowNull: true },
    cancellationReason: { type: DataTypes.STRING(64), allowNull: true },
    meetLink: { type: DataTypes.STRING(512), allowNull: true, defaultValue: null },
    createdByType: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: 'unknown',
    },
    createdByUserId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  { sequelize, tableName: 'bookings', modelName: 'Booking' },
);
