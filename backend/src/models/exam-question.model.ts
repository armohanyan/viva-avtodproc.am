import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../database/sequelize';

export class ExamQuestion extends Model<InferAttributes<ExamQuestion>, InferCreationAttributes<ExamQuestion>> {
  declare id: string;
  declare category: 'rules' | 'signs' | 'safety';
  declare topicId: CreationOptional<string | null>;
  declare correctIndex: number;
  declare imageUrl: CreationOptional<string | null>;
  declare textJson: string;
  declare optionsJson: string;
  declare optionExplanationsJson: CreationOptional<string | null>;
}

ExamQuestion.init(
  {
    id: { type: DataTypes.STRING(64), primaryKey: true },
    category: { type: DataTypes.ENUM('rules', 'signs', 'safety'), allowNull: false },
    topicId: { type: DataTypes.STRING(32), allowNull: true },
    correctIndex: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
    imageUrl: { type: DataTypes.TEXT, allowNull: true },
    textJson: { type: DataTypes.TEXT('long'), allowNull: false },
    optionsJson: { type: DataTypes.TEXT('long'), allowNull: false },
    optionExplanationsJson: { type: DataTypes.TEXT('long'), allowNull: true },
  },
  { sequelize, tableName: 'exam_questions', modelName: 'ExamQuestion' },
);
