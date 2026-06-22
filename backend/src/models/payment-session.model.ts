import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt, fkUnsignedIntNullable } from './auto-id';

export type PaymentSessionKind = 'booking' | 'package' | 'extra_practical';
export type PaymentSessionStatus = 'pending' | 'paid' | 'failed' | 'expired';

export class PaymentSession extends Model<
  InferAttributes<PaymentSession>,
  InferCreationAttributes<PaymentSession>
> {
  declare id: CreationOptional<number>;
  declare orderNumber: string;
  declare epgOrderId: CreationOptional<string | null>;
  declare studentUserId: number;
  declare kind: PaymentSessionKind;
  declare referenceId: CreationOptional<number | null>;
  declare amountAmd: number;
  declare amountMinor: number;
  declare currency: string;
  declare status: PaymentSessionStatus;
  declare providerRef: CreationOptional<string | null>;
  declare language: CreationOptional<string | null>;
  declare meta: CreationOptional<Record<string, unknown> | null>;
  declare rawRegisterResponse: CreationOptional<Record<string, unknown> | null>;
  declare rawStatusResponse: CreationOptional<Record<string, unknown> | null>;
  declare paidAt: CreationOptional<Date | null>;
}

PaymentSession.init(
  {
    id: autoIncrementPk(),
    orderNumber: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    epgOrderId: { type: DataTypes.STRING(64), allowNull: true },
    studentUserId: fkUnsignedInt(),
    kind: {
      type: DataTypes.ENUM('booking', 'package', 'extra_practical'),
      allowNull: false,
    },
    referenceId: fkUnsignedIntNullable(),
    amountAmd: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    amountMinor: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: '051' },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'failed', 'expired'),
      allowNull: false,
      defaultValue: 'pending',
    },
    providerRef: { type: DataTypes.STRING(255), allowNull: true },
    language: { type: DataTypes.STRING(8), allowNull: true },
    meta: { type: DataTypes.JSON, allowNull: true },
    rawRegisterResponse: { type: DataTypes.JSON, allowNull: true },
    rawStatusResponse: { type: DataTypes.JSON, allowNull: true },
    paidAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: 'payment_sessions',
    underscored: true,
    timestamps: true,
  },
);
