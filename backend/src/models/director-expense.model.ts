import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import type { DirectorPaymentMethod } from '../constants/director-payment-method';
import { DIRECTOR_PAYMENT_METHODS } from '../constants/director-payment-method';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt, fkUnsignedIntNullable } from './auto-id';

export class DirectorExpense extends Model<
  InferAttributes<DirectorExpense>,
  InferCreationAttributes<DirectorExpense>
> {
  declare id: CreationOptional<number>;
  declare date: string;
  declare branchId: number;
  declare expType: string;
  declare amount: number;
  declare paymentMethod: DirectorPaymentMethod;
  declare comment: CreationOptional<string | null>;
  declare createdByUserId: CreationOptional<number | null>;
}

DirectorExpense.init(
  {
    id: autoIncrementPk(),
    date: { type: DataTypes.DATEONLY, allowNull: false },
    branchId: fkUnsignedInt(),
    expType: { type: DataTypes.STRING(255), allowNull: false },
    amount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    paymentMethod: {
      type: DataTypes.ENUM(...DIRECTOR_PAYMENT_METHODS),
      allowNull: false,
    },
    comment: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    createdByUserId: fkUnsignedIntNullable(),
  },
  {
    sequelize,
    tableName: 'director_expenses',
    modelName: 'DirectorExpense',
    timestamps: true,
    underscored: true,
  },
);
