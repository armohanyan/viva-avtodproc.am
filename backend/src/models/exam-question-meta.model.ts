import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk } from './auto-id';

export class ExamQuestionMeta extends Model<InferAttributes<ExamQuestionMeta>, InferCreationAttributes<ExamQuestionMeta>> {
  declare id: CreationOptional<number>;
  declare settingKey: string;
  declare valueJson: string;
}

ExamQuestionMeta.init(
  {
    id: autoIncrementPk(),
    settingKey: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    valueJson: { type: DataTypes.TEXT('long'), allowNull: false },
  },
  { sequelize, tableName: 'exam_question_meta', modelName: 'ExamQuestionMeta' },
);
