import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt, fkUnsignedIntNullable } from './auto-id';

export class InstructorKmLog extends Model<
  InferAttributes<InstructorKmLog>,
  InferCreationAttributes<InstructorKmLog>
> {
  declare id: CreationOptional<number>;
  declare instructorUserId: number;
  declare date: string;
  declare km: number;
  declare createdByUserId: CreationOptional<number | null>;
}

InstructorKmLog.init(
  {
    id: autoIncrementPk(),
    instructorUserId: fkUnsignedInt(),
    date: { type: DataTypes.DATEONLY, allowNull: false },
    km: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    createdByUserId: fkUnsignedIntNullable(),
  },
  {
    sequelize,
    tableName: 'instructor_km_logs',
    modelName: 'InstructorKmLog',
    timestamps: true,
    underscored: true,
  },
);
