import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk } from './auto-id';

/** Per-branch practical lesson start times (JSON array in `planJson`). */
export class BranchPracticalSlotPlan extends Model<
  InferAttributes<BranchPracticalSlotPlan>,
  InferCreationAttributes<BranchPracticalSlotPlan>
> {
  declare id: CreationOptional<number>;
  declare branchId: number;
  declare planJson: string;
}

BranchPracticalSlotPlan.init(
  {
    id: autoIncrementPk(),
    branchId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
    planJson: { type: DataTypes.TEXT, allowNull: false },
  },
  {
    sequelize,
    tableName: 'branch_practical_slot_plans',
    modelName: 'BranchPracticalSlotPlan',
    underscored: true,
  },
);
