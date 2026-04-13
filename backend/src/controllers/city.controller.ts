import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody } from '../helpers';
import CityService from '../services/city.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { ResourceNotFoundError } = ErrorsUtil;

const createSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
});

export default class CityController {
  static async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await CityService.list();
      SuccessHandlerUtil.handleList(res, next, data.map((c) => ({ id: c.id, name: c.name })));
    } catch (e) {
      next(e);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(createSchema, req.body);
      const row = await CityService.create(body);
      SuccessHandlerUtil.handleAdd(res, next, { id: row.id, name: row.name });
    } catch (e) {
      next(e);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(updateSchema, req.body);
      const row = await CityService.update(req.params.id!, body);
      if (!row) {
        return next(new ResourceNotFoundError('City not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleUpdate(res, next, { id: row.id, name: row.name });
    } catch (e) {
      next(e);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const ok = await CityService.remove(req.params.id!);
      if (!ok) {
        return next(new ResourceNotFoundError('City not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }
}
