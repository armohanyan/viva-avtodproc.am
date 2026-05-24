import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import type { DistanceUnit, PetrolVolumeUnit } from '../constants/petrol-consumption-units';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt, fkUnsignedIntNullable } from './auto-id';

export class PetrolConsumption extends Model<
  InferAttributes<PetrolConsumption>,
  InferCreationAttributes<PetrolConsumption>
> {
  declare id: CreationOptional<number>;
  declare carId: number;
  declare instructorUserId: number;
  declare date: string;
  declare distanceValue: number;
  declare distanceUnit: DistanceUnit;
  declare petrolAmount: CreationOptional<number | null>;
  declare petrolUnit: PetrolVolumeUnit;
  declare description: CreationOptional<string | null>;
  declare createdByUserId: CreationOptional<number | null>;
}

PetrolConsumption.init(
  {
    id: autoIncrementPk(),
    carId: fkUnsignedInt(),
    instructorUserId: fkUnsignedInt(),
    date: { type: DataTypes.DATEONLY, allowNull: false },
    distanceValue: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    distanceUnit: {
      type: DataTypes.ENUM('km', 'mile'),
      allowNull: false,
      defaultValue: 'km',
    },
    petrolAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: null },
    petrolUnit: {
      type: DataTypes.ENUM('liter', 'ml'),
      allowNull: false,
      defaultValue: 'liter',
    },
    description: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    createdByUserId: fkUnsignedIntNullable(),
  },
  {
    sequelize,
    tableName: 'petrol_consumptions',
    modelName: 'PetrolConsumption',
    timestamps: true,
    underscored: true,
  },
);
