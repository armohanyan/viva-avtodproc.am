import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk, fkUnsignedInt } from './auto-id';

export class PackageLessonBalance extends Model<
  InferAttributes<PackageLessonBalance>,
  InferCreationAttributes<PackageLessonBalance>
> {
  declare id: CreationOptional<number>;
  declare packageOrderId: number;
  declare studentUserId: number;
  declare packageId: number;
  declare lessonType: 'practical' | 'theory' | 'theory_personal';
  declare totalIncluded: number;
  declare bookedCount: number;
}

PackageLessonBalance.init(
  {
    id: autoIncrementPk(),
    packageOrderId: fkUnsignedInt(),
    studentUserId: fkUnsignedInt(),
    packageId: fkUnsignedInt(),
    lessonType: { type: DataTypes.ENUM('practical', 'theory', 'theory_personal'), allowNull: false },
    totalIncluded: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    bookedCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  },
  { sequelize, tableName: 'package_lesson_balances', modelName: 'PackageLessonBalance' },
);
