import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseParams } from '../helpers';
import LessonCompletionService from '../services/lesson-completion.service';
import StudentProgressService from '../services/student-progress.service';

export default class AdminJobsController {
  /** Staff: run lesson-completion cron logic on demand (idempotent). */
  static async runLessonCompletion(req: Request, res: Response, next: NextFunction) {
    try {
      const completion = await LessonCompletionService.markDueLessonsCompleted();
      const rawStudentId = req.query.studentId;
      const studentId =
        typeof rawStudentId === 'string'
          ? Number(rawStudentId)
          : Array.isArray(rawStudentId) && typeof rawStudentId[0] === 'string'
            ? Number(rawStudentId[0])
            : undefined;

      let progress = null;
      if (Number.isFinite(studentId) && studentId! > 0) {
        progress = await StudentProgressService.getForStudent(studentId!);
      }

      res.status(200).json({ completion, progress });
    } catch (e) {
      next(e);
    }
  }

  /** Staff: return recalculated progress for one student (no side effects). */
  static async getStudentProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId } = parseParams(
        z.object({ studentId: z.coerce.number().int().positive() }),
        req.params,
      );
      const progress = await StudentProgressService.getForStudent(studentId);
      if (!progress) {
        res.status(404).json({ message: 'Student not found' });
        return;
      }
      res.status(200).json(progress);
    } catch (e) {
      next(e);
    }
  }
}
