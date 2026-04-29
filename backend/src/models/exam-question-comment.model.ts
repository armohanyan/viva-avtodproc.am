import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { autoIncrementPk } from './auto-id';

export class ExamQuestionComment extends Model<InferAttributes<ExamQuestionComment>, InferCreationAttributes<ExamQuestionComment>> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare questionId: string;
  declare body: string;
}

ExamQuestionComment.init(
  {
    id: autoIncrementPk(),
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    questionId: { type: DataTypes.STRING(64), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
  },
  {
    sequelize,
    tableName: 'exam_question_comments',
    modelName: 'ExamQuestionComment',
    indexes: [{ fields: ['question_id', 'created_at'] }],
  },
);
