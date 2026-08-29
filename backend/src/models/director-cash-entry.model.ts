import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt, fkUnsignedIntNullable } from './auto-id';

export class DirectorCashEntry extends Model<
  InferAttributes<DirectorCashEntry>,
  InferCreationAttributes<DirectorCashEntry>
> {
  declare id: CreationOptional<number>;
  declare date: string;
  declare branchId: number | null;
  declare entryType: string;
  declare amount: number;
  declare comment: CreationOptional<string | null>;
  declare createdByUserId: CreationOptional<number | null>;
}

DirectorCashEntry.init(
  {
    id: autoIncrementPk(),
    date: { type: DataTypes.DATEONLY, allowNull: false },
    branchId: fkUnsignedIntNullable(),
    entryType: { type: DataTypes.STRING(255), allowNull: false },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    comment: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    createdByUserId: fkUnsignedIntNullable(),
  },
  {
    sequelize,
    tableName: 'director_cash_entries',
    modelName: 'DirectorCashEntry',
    timestamps: true,
    underscored: true,
  },
);
