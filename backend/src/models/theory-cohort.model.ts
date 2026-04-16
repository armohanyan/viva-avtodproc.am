import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt } from './auto-id';

export class TheoryCohort extends Model<InferAttributes<TheoryCohort>, InferCreationAttributes<TheoryCohort>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare startDateIso: string;
  declare endDateIso: string;
  declare schedule: string;
  declare seats: number;
  declare instructorName: string;
  declare meetLink: string;
  declare status: string;
  declare branchId: number;
}

TheoryCohort.init(
  {
    id: autoIncrementPk(),
    name: { type: DataTypes.STRING(255), allowNull: false },
    startDateIso: { type: DataTypes.DATEONLY, allowNull: false },
    endDateIso: { type: DataTypes.DATEONLY, allowNull: false },
    schedule: { type: DataTypes.STRING(255), allowNull: false },
    seats: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    instructorName: { type: DataTypes.STRING(255), allowNull: false },
    meetLink: { type: DataTypes.STRING(512), allowNull: false, defaultValue: '' },
    status: { type: DataTypes.STRING(32), allowNull: false },
    branchId: fkUnsignedInt(),
  },
  { sequelize, tableName: 'theory_cohorts', modelName: 'TheoryCohort' },
);
