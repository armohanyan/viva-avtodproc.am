import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk } from './auto-id';

/** Per-instructor practical lesson start times (JSON array in `planJson`). */
export class InstructorPracticalSlotPlan extends Model<
  InferAttributes<InstructorPracticalSlotPlan>,
  InferCreationAttributes<InstructorPracticalSlotPlan>
> {
  declare id: CreationOptional<number>;
  declare instructorUserId: number;
  declare planJson: string;
}

InstructorPracticalSlotPlan.init(
  {
    id: autoIncrementPk(),
    instructorUserId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
    planJson: { type: DataTypes.TEXT, allowNull: false },
  },
  {
    sequelize,
    tableName: 'instructor_practical_slot_plans',
    modelName: 'InstructorPracticalSlotPlan',
    underscored: true,
  },
);
