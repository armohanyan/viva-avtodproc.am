import { Op } from 'sequelize';
import {
  addManagedFilenameFromUrl,
  deleteManagedUploadFile,
  deleteManagedUploadFiles,
  managedFilenameFromUrl,
} from '../helpers/managed-upload.helper';
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
    const oldRows = await ExamQuestion.findAll();
    const oldFiles = new Set<string>();
    for (const r of oldRows) {
      addManagedFilenameFromUrl(r.imageUrl, oldFiles);
    }
    const newFiles = new Set<string>();
    for (const q of questions) {
      addManagedFilenameFromUrl(q.imageUrl ?? null, newFiles);
    }

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

    const toRemove = [...oldFiles].filter((f) => !newFiles.has(f));
    await deleteManagedUploadFiles(toRemove);
  }

  static async upsertOne(q: ExamQuestionDto): Promise<ExamQuestionDto> {
    const prev = await ExamQuestion.findByPk(q.id);
    const prevFile = managedFilenameFromUrl(prev?.imageUrl ?? null);
    const nextFile = managedFilenameFromUrl(q.imageUrl ?? null);

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

    if (prevFile && prevFile !== nextFile) {
      const others = await ExamQuestion.count({
        where: {
          id: { [Op.ne]: q.id },
          imageUrl: { [Op.like]: `%/upload/${prevFile}%` },
        },
      });
      if (others === 0) {
        await deleteManagedUploadFile(prevFile);
      }
    }

    const row = await ExamQuestion.findByPk(q.id);
    return toDto(row!);
  }

  static async remove(id: string): Promise<boolean> {
    const found = await ExamQuestion.findByPk(id);
    const file = managedFilenameFromUrl(found?.imageUrl ?? null);
    const n = await ExamQuestion.destroy({ where: { id } });
    if (n > 0 && file) {
      const others = await ExamQuestion.count({
        where: {
          id: { [Op.ne]: id },
          imageUrl: { [Op.like]: `%/upload/${file}%` },
        },
      });
      if (others === 0) {
        await deleteManagedUploadFile(file);
      }
    }
    return n > 0;
  }
}
