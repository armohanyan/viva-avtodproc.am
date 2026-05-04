import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt, fkUnsignedIntNullable } from './auto-id';

export type FinanceTxStatus = 'completed' | 'pending' | 'failed' | 'refunded';
export type FinanceTxChannel = 'online' | 'pos' | 'office' | 'bank';
export type FinanceTxMethod = 'card' | 'idram' | 'cash' | 'transfer';
export type FinanceTxSource = 'system' | 'manual';
export type FinanceTxEntryType = 'income' | 'expense';
export type FinanceTxExpenseKind =
  | 'salary'
  | 'hourly_rate'
  | 'rent'
  | 'utilities'
  | 'maintenance'
  | 'marketing'
  | 'booking_refund'
  | 'other';

export class FinanceTransaction extends Model<
  InferAttributes<FinanceTransaction>,
  InferCreationAttributes<FinanceTransaction>
> {
  declare id: CreationOptional<number>;
  declare customer: string;
  declare email: string;
  declare description: string;
  declare branchId: number;
  declare channel: FinanceTxChannel;
  declare method: FinanceTxMethod;
  declare grossAmd: number;
  declare feeAmd: number;
  declare status: FinanceTxStatus;
  declare providerRef: string;
  declare source: FinanceTxSource;
  declare entryType: FinanceTxEntryType;
  declare expenseKind: CreationOptional<FinanceTxExpenseKind | null>;
  declare employeeName: CreationOptional<string | null>;
  declare units: CreationOptional<number | null>;
  declare unitRateAmd: CreationOptional<number | null>;
  /** Student requested a refund for this payment; staff reviews asynchronously. */
  declare refundRequestedAt: CreationOptional<Date | null>;
  /** Staff decision timestamp for refund request processing. */
  declare refundReviewedAt: CreationOptional<Date | null>;
  /** When set, this payment line is tied to a scheduled lesson (e.g. single lesson or extra hour). Package / exam fees typically stay null. */
  declare bookingId: CreationOptional<number | null>;
  /** For `booking_refund` expense rows: original income transaction that was refunded (partial/full). */
  declare relatedPaymentTransactionId: CreationOptional<number | null>;
}

FinanceTransaction.init(
  {
    id: autoIncrementPk(),
    customer: { type: DataTypes.STRING(255), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
    description: { type: DataTypes.STRING(512), allowNull: false },
    branchId: fkUnsignedInt(),
    channel: {
      type: DataTypes.ENUM('online', 'pos', 'office', 'bank'),
      allowNull: false,
    },
    method: {
      type: DataTypes.ENUM('card', 'idram', 'cash', 'transfer'),
      allowNull: false,
    },
    grossAmd: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    feeAmd: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    status: {
      type: DataTypes.ENUM('completed', 'pending', 'failed', 'refunded'),
      allowNull: false,
    },
    providerRef: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
    source: {
      type: DataTypes.ENUM('system', 'manual'),
      allowNull: false,
      defaultValue: 'system',
    },
    entryType: {
      type: DataTypes.ENUM('income', 'expense'),
      allowNull: false,
      defaultValue: 'income',
    },
    expenseKind: {
      type: DataTypes.ENUM(
        'salary',
        'hourly_rate',
        'rent',
        'utilities',
        'maintenance',
        'marketing',
        'booking_refund',
        'other',
      ),
      allowNull: true,
      defaultValue: null,
    },
    employeeName: { type: DataTypes.STRING(255), allowNull: true, defaultValue: null },
    units: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: null },
    unitRateAmd: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null },
    refundRequestedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    refundReviewedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    bookingId: {
      ...fkUnsignedIntNullable(),
      references: { model: 'bookings', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    relatedPaymentTransactionId: fkUnsignedIntNullable(),
  },
  {
    sequelize,
    tableName: 'finance_transactions',
    modelName: 'FinanceTransaction',
    indexes: [
      { fields: ['booking_id'] },
      { fields: ['provider_ref'] },
      { fields: ['booking_id', 'entry_type', 'status'] },
      { fields: ['booking_id', 'provider_ref'] },
    ],
  },
);
