import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk } from './auto-id';

export class ExamQuestionBookmark extends Model<
  InferAttributes<ExamQuestionBookmark>,
  InferCreationAttributes<ExamQuestionBookmark>
> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare questionId: string;
}

ExamQuestionBookmark.init(
  {
    id: autoIncrementPk(),
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    questionId: { type: DataTypes.STRING(64), allowNull: false },
  },
  {
    sequelize,
    tableName: 'exam_question_bookmarks',
    modelName: 'ExamQuestionBookmark',
    indexes: [{ unique: true, fields: ['user_id', 'question_id'] }],
  },
);
