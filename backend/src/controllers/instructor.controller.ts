import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody } from '../helpers';
import InstructorService from '../services/instructor.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { ResourceNotFoundError } = ErrorsUtil;

const createSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string(),
  years: z.number().int().nonnegative(),
  rating: z.number().min(0).max(5),
  hourlyPrice: z.number().int().nonnegative(),
  status: z.enum(['active', 'inactive']),
  schedule: z.string(),
  location: z.string(),
  car: z.string(),
  transmission: z.string(),
  imageSrc: z.string(),
  availableBranchIds: z.array(z.string()),
  teachesPractical: z.boolean(),
  teachesTheory: z.boolean(),
});

const updateSchema = createSchema.partial().omit({ id: true });

export default class InstructorController {
  static async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await InstructorService.list();
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(createSchema, req.body);
      const row = await InstructorService.create(body);
      SuccessHandlerUtil.handleAdd(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(updateSchema, req.body);
      const row = await InstructorService.update(req.params.id!, body);
      if (!row) {
        return next(new ResourceNotFoundError('Instructor not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const ok = await InstructorService.remove(req.params.id!);
      if (!ok) {
        return next(new ResourceNotFoundError('Instructor not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }
}
