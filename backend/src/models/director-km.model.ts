import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt, fkUnsignedIntNullable } from './auto-id';

export class DirectorKm extends Model<
  InferAttributes<DirectorKm>,
  InferCreationAttributes<DirectorKm>
> {
  declare id: CreationOptional<number>;
  declare date: string;
  declare instructorUserId: number;
  declare km: number;
  declare comment: CreationOptional<string | null>;
  declare createdByUserId: CreationOptional<number | null>;
}

DirectorKm.init(
  {
    id: autoIncrementPk(),
    date: { type: DataTypes.DATEONLY, allowNull: false },
    instructorUserId: fkUnsignedInt(),
    km: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    comment: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    createdByUserId: fkUnsignedIntNullable(),
  },
  {
    sequelize,
    tableName: 'director_km',
    modelName: 'DirectorKm',
    timestamps: true,
    underscored: true,
  },
);
