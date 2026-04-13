import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';

export type FinanceTxStatus = 'completed' | 'pending' | 'failed' | 'refunded';
export type FinanceTxChannel = 'online' | 'pos' | 'office' | 'bank';
export type FinanceTxMethod = 'card' | 'idram' | 'cash' | 'transfer';
export type FinanceTxSource = 'system' | 'manual';

export class FinanceTransaction extends Model<
  InferAttributes<FinanceTransaction>,
  InferCreationAttributes<FinanceTransaction>
> {
  declare id: string;
  declare customer: string;
  declare email: string;
  declare description: string;
  declare branchId: string;
  declare channel: FinanceTxChannel;
  declare method: FinanceTxMethod;
  declare grossAmd: number;
  declare feeAmd: number;
  declare status: FinanceTxStatus;
  declare providerRef: string;
  declare source: FinanceTxSource;
  /** When set, this payment line is tied to a scheduled lesson (e.g. single lesson or extra hour). Package / exam fees typically stay null. */
  declare bookingId: CreationOptional<string | null>;
}

FinanceTransaction.init(
  {
    id: { type: DataTypes.STRING(64), primaryKey: true },
    customer: { type: DataTypes.STRING(255), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
    description: { type: DataTypes.STRING(512), allowNull: false },
    branchId: { type: DataTypes.STRING(64), allowNull: false },
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
    bookingId: {
      type: DataTypes.STRING(64),
      allowNull: true,
      references: { model: 'bookings', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
  },
  { sequelize, tableName: 'finance_transactions', modelName: 'FinanceTransaction' },
);
