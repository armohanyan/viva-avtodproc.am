import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import type { DirectorPaymentMethod } from '../constants/director-payment-method';
import { DIRECTOR_PAYMENT_METHODS } from '../constants/director-payment-method';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedIntNullable } from './auto-id';

export class DirectorRepair extends Model<
  InferAttributes<DirectorRepair>,
  InferCreationAttributes<DirectorRepair>
> {
  declare id: CreationOptional<number>;
  declare date: string;
  declare carId: CreationOptional<number | null>;
  declare licensePlate: CreationOptional<string | null>;
  declare workDone: string;
  declare amount: number;
  declare paymentMethod: DirectorPaymentMethod;
  declare comment: CreationOptional<string | null>;
  declare createdByUserId: CreationOptional<number | null>;
}

DirectorRepair.init(
  {
    id: autoIncrementPk(),
    date: { type: DataTypes.DATEONLY, allowNull: false },
    carId: fkUnsignedIntNullable(),
    licensePlate: { type: DataTypes.STRING(64), allowNull: true, defaultValue: null },
    workDone: { type: DataTypes.STRING(512), allowNull: false },
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
    tableName: 'director_repairs',
    modelName: 'DirectorRepair',
    timestamps: true,
    underscored: true,
  },
);
