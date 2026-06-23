import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import type { PetrolPaymentType } from '../constants/petrol-payment-type';
import type { PetrolType } from '../constants/petrol-type';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt, fkUnsignedIntNullable } from './auto-id';

export class PetrolExpense extends Model<
  InferAttributes<PetrolExpense>,
  InferCreationAttributes<PetrolExpense>
> {
  declare id: CreationOptional<number>;
  declare carId: number;
  declare instructorUserId: number;
  declare date: string;
  declare petrolType: PetrolType;
  declare petrolCount: CreationOptional<number | null>;
  declare paymentType: CreationOptional<PetrolPaymentType>;
  declare price: number;
  declare description: CreationOptional<string | null>;
  declare createdByUserId: CreationOptional<number | null>;
}

PetrolExpense.init(
  {
    id: autoIncrementPk(),
    carId: fkUnsignedInt(),
    instructorUserId: fkUnsignedInt(),
    date: { type: DataTypes.DATEONLY, allowNull: false },
    petrolType: {
      type: DataTypes.ENUM('benzin', 'lpg'),
      allowNull: false,
      defaultValue: 'benzin',
    },
    petrolCount: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: null },
    paymentType: {
      type: DataTypes.ENUM('card', 'cash', 'pos'),
      allowNull: false,
      defaultValue: 'cash',
    },
    price: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    createdByUserId: fkUnsignedIntNullable(),
  },
  {
    sequelize,
    tableName: 'petrol_expenses',
    modelName: 'PetrolExpense',
    timestamps: true,
    underscored: true,
  },
);
