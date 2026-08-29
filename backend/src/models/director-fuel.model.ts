import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import type { DirectorPaymentMethod } from '../constants/director-payment-method';
import { DIRECTOR_PAYMENT_METHODS } from '../constants/director-payment-method';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt, fkUnsignedIntNullable } from './auto-id';

export class DirectorFuel extends Model<
  InferAttributes<DirectorFuel>,
  InferCreationAttributes<DirectorFuel>
> {
  declare id: CreationOptional<number>;
  declare date: string;
  declare instructorUserId: number | null;
  declare carId: CreationOptional<number | null>;
  declare fuelType: string;
  declare liters: number;
  declare amount: number;
  declare paymentMethod: DirectorPaymentMethod;
  declare createdByUserId: CreationOptional<number | null>;
}

DirectorFuel.init(
  {
    id: autoIncrementPk(),
    date: { type: DataTypes.DATEONLY, allowNull: false },
    instructorUserId: fkUnsignedIntNullable(),
    carId: fkUnsignedIntNullable(),
    fuelType: { type: DataTypes.STRING(255), allowNull: false },
    liters: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    amount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    paymentMethod: {
      type: DataTypes.ENUM(...DIRECTOR_PAYMENT_METHODS),
      allowNull: false,
    },
    createdByUserId: fkUnsignedIntNullable(),
  },
  {
    sequelize,
    tableName: 'director_fuel',
    modelName: 'DirectorFuel',
    timestamps: true,
    underscored: true,
  },
);
