import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt, fkUnsignedIntNullable } from './auto-id';

/** One row per booked hour; unique (instructor, date, slot start) prevents double booking races. */
export class BookingSlot extends Model<InferAttributes<BookingSlot>, InferCreationAttributes<BookingSlot>> {
  declare id: CreationOptional<number>;
  declare bookingId: number;
  declare instructorUserId: CreationOptional<number | null>;
  declare dateIso: string;
  declare slotTime: string;
}

BookingSlot.init(
  {
    id: autoIncrementPk(),
    bookingId: fkUnsignedInt(),
    instructorUserId: fkUnsignedIntNullable(),
    dateIso: { type: DataTypes.DATEONLY, allowNull: false },
    slotTime: { type: DataTypes.STRING(16), allowNull: false },
  },
  {
    sequelize,
    tableName: 'booking_slots',
    modelName: 'BookingSlot',
    indexes: [
      {
        name: 'booking_slots_inst_date_slot_uniq',
        unique: true,
        fields: ['instructor_user_id', 'date_iso', 'slot_time'],
      },
      { name: 'booking_slots_booking_id_idx', fields: ['booking_id'] },
    ],
  },
);
