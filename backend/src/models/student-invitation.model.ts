import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt } from './auto-id';

export class StudentInvitation extends Model<
  InferAttributes<StudentInvitation>,
  InferCreationAttributes<StudentInvitation>
> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare tokenHash: string;
  declare expiresAt: Date;
  declare consumedAt: CreationOptional<Date | null>;
}

StudentInvitation.init(
  {
    id: autoIncrementPk(),
    userId: fkUnsignedInt(),
    tokenHash: { type: DataTypes.STRING(128), allowNull: false, unique: true },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    consumedAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, tableName: 'student_invitations', modelName: 'StudentInvitation' },
);
