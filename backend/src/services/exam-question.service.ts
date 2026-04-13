import { ExamQuestion } from '../models';

export type ExamQuestionDto = {
  id: string;
  text: Record<string, string>;
  options: Record<string, string[]>;
  optionExplanations?: Record<string, (string | null)[]>;
  correctIndex: number;
  category: 'rules' | 'signs' | 'safety';
  topicId?: string;
  imageUrl?: string | null;
};

function toDto(row: ExamQuestion): ExamQuestionDto {
  const text = JSON.parse(row.textJson) as Record<string, string>;
  const options = JSON.parse(row.optionsJson) as Record<string, string[]>;
  let optionExplanations: Record<string, (string | null)[]> | undefined;
  if (row.optionExplanationsJson) {
    optionExplanations = JSON.parse(row.optionExplanationsJson) as Record<string, (string | null)[]>;
  }
  return {
    id: row.id,
    text,
    options,
    optionExplanations,
    correctIndex: row.correctIndex,
    category: row.category,
    topicId: row.topicId ?? undefined,
    imageUrl: row.imageUrl,
  };
}

export default class ExamQuestionService {
  static async list(): Promise<ExamQuestionDto[]> {
    const rows = await ExamQuestion.findAll({ order: [['id', 'ASC']] });
    return rows.map(toDto);
  }

  static async replaceAll(questions: ExamQuestionDto[]): Promise<void> {
    await ExamQuestion.destroy({ where: {} });
    await ExamQuestion.bulkCreate(
      questions.map((q) => ({
        id: q.id,
        category: q.category,
        topicId: q.topicId ?? null,
        correctIndex: q.correctIndex,
        imageUrl: q.imageUrl ?? null,
        textJson: JSON.stringify(q.text),
        optionsJson: JSON.stringify(q.options),
        optionExplanationsJson: q.optionExplanations ? JSON.stringify(q.optionExplanations) : null,
      })),
    );
  }

  static async upsertOne(q: ExamQuestionDto): Promise<ExamQuestionDto> {
    await ExamQuestion.upsert({
      id: q.id,
      category: q.category,
      topicId: q.topicId ?? null,
      correctIndex: q.correctIndex,
      imageUrl: q.imageUrl ?? null,
      textJson: JSON.stringify(q.text),
      optionsJson: JSON.stringify(q.options),
      optionExplanationsJson: q.optionExplanations ? JSON.stringify(q.optionExplanations) : null,
    });
    const row = await ExamQuestion.findByPk(q.id);
    return toDto(row!);
  }

  static async remove(id: string): Promise<boolean> {
    const n = await ExamQuestion.destroy({ where: { id } });
    return n > 0;
  }
}
