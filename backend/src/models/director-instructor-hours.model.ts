import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt, fkUnsignedIntNullable } from './auto-id';

export class DirectorInstructorHours extends Model<
  InferAttributes<DirectorInstructorHours>,
  InferCreationAttributes<DirectorInstructorHours>
> {
  declare id: CreationOptional<number>;
  declare date: string;
  declare instructorUserId: number;
  declare hours: number;
  declare comment: CreationOptional<string | null>;
  declare createdByUserId: CreationOptional<number | null>;
}

DirectorInstructorHours.init(
  {
    id: autoIncrementPk(),
    date: { type: DataTypes.DATEONLY, allowNull: false },
    instructorUserId: fkUnsignedInt(),
    hours: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    comment: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    createdByUserId: fkUnsignedIntNullable(),
  },
  {
    sequelize,
    tableName: 'director_instructor_hours',
    modelName: 'DirectorInstructorHours',
    timestamps: true,
    underscored: true,
  },
);
