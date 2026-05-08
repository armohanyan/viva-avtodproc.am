import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt, fkUnsignedIntNullable } from './auto-id';

export class PackageOrder extends Model<InferAttributes<PackageOrder>, InferCreationAttributes<PackageOrder>> {
  declare id: CreationOptional<number>;
  declare studentUserId: number;
  declare packageId: number;
  declare status: string;
  declare paidAt: CreationOptional<Date | null>;
  declare expiresAt: CreationOptional<Date | null>;
  declare source: CreationOptional<string | null>;
  declare note: CreationOptional<string | null>;
  declare financeTransactionId: CreationOptional<number | null>;
}

PackageOrder.init(
  {
    id: autoIncrementPk(),
    studentUserId: fkUnsignedInt(),
    packageId: fkUnsignedInt(),
    status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'active' },
    paidAt: { type: DataTypes.DATE, allowNull: true },
    expiresAt: { type: DataTypes.DATE, allowNull: true },
    source: { type: DataTypes.STRING(32), allowNull: true },
    note: { type: DataTypes.STRING(255), allowNull: true },
    financeTransactionId: fkUnsignedIntNullable(),
  },
  { sequelize, tableName: 'package_orders', modelName: 'PackageOrder' },
);
