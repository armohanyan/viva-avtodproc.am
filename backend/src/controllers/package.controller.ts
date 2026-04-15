import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody } from '../helpers';
import PackageService from '../services/package.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { ResourceNotFoundError } = ErrorsUtil;

const createSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  price: z.string().min(1),
  lessons: z.number().int().positive(),
  status: z.string().optional(),
  features: z.array(z.string()).optional(),
  imageUrl: z.union([z.string().max(4000), z.literal(''), z.null()]).optional(),
});

const updateSchema = createSchema.partial().omit({ id: true });

export default class PackageController {
  static async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await PackageService.list();
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(createSchema, req.body);
      const row = await PackageService.create(body);
      SuccessHandlerUtil.handleAdd(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(updateSchema, req.body);
      const row = await PackageService.update(req.params.id!, body);
      if (!row) {
        return next(new ResourceNotFoundError('Package not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const ok = await PackageService.remove(req.params.id!);
      if (!ok) {
        return next(new ResourceNotFoundError('Package not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }
}
