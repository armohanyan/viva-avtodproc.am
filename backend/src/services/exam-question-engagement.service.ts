import { ExamQuestionBookmark, ExamQuestionComment, User } from '../models';
import ExamQuestionService from './exam-question.service';

export type ExamQuestionCommentDto = {
  id: number;
  questionId: string;
  text: string;
  createdAt: string;
  commenter: {
    id: number;
    name: string;
    role: 'super_admin' | 'admin' | 'instructor' | 'student';
  };
};

export type PaginatedComments = {
  items: ExamQuestionCommentDto[];
  total: number;
  page: number;
  pageSize: number;
};

export default class ExamQuestionEngagementService {
  static async questionExists(questionId: string): Promise<boolean> {
    const row = await ExamQuestionService.getById(questionId);
    return Boolean(row);
  }

  static async listComments(questionId: string, page: number, pageSize: number): Promise<PaginatedComments> {
    const offset = (page - 1) * pageSize;
    const { rows, count } = await ExamQuestionComment.findAndCountAll({
      where: { questionId },
      order: [['createdAt', 'ASC']],
      limit: pageSize,
      offset,
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'accountType'] }],
    });
    const items = rows.map((row) => {
      const user = row.get('user') as User | undefined;
      const createdAt = (row as unknown as { createdAt: Date }).createdAt;
      return {
        id: row.id,
        questionId: row.questionId,
        text: row.body,
        createdAt: createdAt.toISOString(),
        commenter: {
          id: user?.id ?? row.userId,
          name: user?.name ?? 'Unknown',
          role: (user?.accountType ?? 'student') as ExamQuestionCommentDto['commenter']['role'],
        },
      };
    });
    return { items, total: count, page, pageSize };
  }

  static async addComment(questionId: string, userId: number, text: string): Promise<ExamQuestionCommentDto | null> {
    const created = await ExamQuestionComment.create({ questionId, userId, body: text });
    const row = await ExamQuestionComment.findByPk(created.id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'accountType'] }],
    });
    if (!row) return null;
    const user = row.get('user') as User | undefined;
    const createdAt = (row as unknown as { createdAt: Date }).createdAt;
    return {
      id: row.id,
      questionId: row.questionId,
      text: row.body,
      createdAt: createdAt.toISOString(),
      commenter: {
        id: user?.id ?? row.userId,
        name: user?.name ?? 'Unknown',
        role: (user?.accountType ?? 'student') as ExamQuestionCommentDto['commenter']['role'],
      },
    };
  }

  static async removeComment(commentId: number): Promise<boolean> {
    const n = await ExamQuestionComment.destroy({ where: { id: commentId } });
    return n > 0;
  }

  static async setSaved(questionId: string, userId: number, saved: boolean): Promise<boolean> {
    if (saved) {
      await ExamQuestionBookmark.findOrCreate({ where: { questionId, userId }, defaults: { questionId, userId } });
      return true;
    }
    await ExamQuestionBookmark.destroy({ where: { questionId, userId } });
    return false;
  }

  static async isSaved(questionId: string, userId: number): Promise<boolean> {
    const row = await ExamQuestionBookmark.findOne({ where: { questionId, userId } });
    return Boolean(row);
  }

  static async listSavedQuestionIds(userId: number): Promise<string[]> {
    const rows = await ExamQuestionBookmark.findAll({ where: { userId }, order: [['createdAt', 'DESC']] });
    return rows.map((r) => r.questionId);
  }
}
