import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import type { DirectorPaymentMethod } from '../constants/director-payment-method';
import { DIRECTOR_PAYMENT_METHODS } from '../constants/director-payment-method';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt, fkUnsignedIntNullable } from './auto-id';

export class DirectorRevenue extends Model<
  InferAttributes<DirectorRevenue>,
  InferCreationAttributes<DirectorRevenue>
> {
  declare id: CreationOptional<number>;
  declare date: string;
  declare branchId: number;
  declare amount: number;
  declare paymentMethod: DirectorPaymentMethod;
  declare isLegacy: CreationOptional<boolean>;
  declare comment: CreationOptional<string | null>;
  declare createdByUserId: CreationOptional<number | null>;
}

DirectorRevenue.init(
  {
    id: autoIncrementPk(),
    date: { type: DataTypes.DATEONLY, allowNull: false },
    branchId: fkUnsignedInt(),
    amount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    paymentMethod: {
      type: DataTypes.ENUM(...DIRECTOR_PAYMENT_METHODS),
      allowNull: false,
    },
    isLegacy: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    comment: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    createdByUserId: fkUnsignedIntNullable(),
  },
  {
    sequelize,
    tableName: 'director_revenues',
    modelName: 'DirectorRevenue',
    timestamps: true,
    underscored: true,
  },
);
