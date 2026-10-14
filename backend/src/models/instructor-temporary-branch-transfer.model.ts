import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt } from './auto-id';

/**
 * Inclusive date range when an instructor works only at `branchId`
 * instead of their permanent `instructor_branches` links.
 */
export class InstructorTemporaryBranchTransfer extends Model<
  InferAttributes<InstructorTemporaryBranchTransfer>,
  InferCreationAttributes<InstructorTemporaryBranchTransfer>
> {
  declare id: CreationOptional<number>;
  declare instructorUserId: number;
  declare branchId: number;
  declare startsOn: string;
  declare endsOn: string;
}

InstructorTemporaryBranchTransfer.init(
  {
    id: autoIncrementPk(),
    instructorUserId: fkUnsignedInt(),
    branchId: fkUnsignedInt(),
    startsOn: { type: DataTypes.DATEONLY, allowNull: false },
    endsOn: { type: DataTypes.DATEONLY, allowNull: false },
  },
  {
    sequelize,
    tableName: 'instructor_temporary_branch_transfers',
    modelName: 'InstructorTemporaryBranchTransfer',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['instructor_user_id', 'starts_on', 'ends_on'], name: 'instr_temp_branch_range_idx' },
      { fields: ['branch_id', 'ends_on'], name: 'instr_temp_branch_branch_end_idx' },
    ],
  },
);
