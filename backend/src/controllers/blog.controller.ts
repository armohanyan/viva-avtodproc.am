import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody } from '../helpers';
import BlogService from '../services/blog.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { ResourceNotFoundError } = ErrorsUtil;

/** ASCII-only public URL segment (Latin letters, digits, hyphens). */
const blogSlugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must use lowercase English letters, numbers, and hyphens only');

const createSchema = z.object({
  slug: blogSlugSchema,
  title: z.string().min(1),
  excerpt: z.string(),
  bodyHtml: z.string(),
  coverImage: z.string().nullable().optional(),
  published: z.boolean().optional(),
  publishedAt: z.string().optional(),
});

const updateSchema = createSchema.partial();

export default class BlogController {
  static async listPublished(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await BlogService.listPublished();
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async listAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await BlogService.listAll();
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const row = await BlogService.getBySlug(req.params.slug!);
      SuccessHandlerUtil.handleGet(res, next, row ?? undefined);
    } catch (e) {
      next(e);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(createSchema, req.body);
      const row = await BlogService.create(body);
      SuccessHandlerUtil.handleAdd(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(updateSchema, req.body);
      const row = await BlogService.update(Number(req.params.id), body);
      if (!row) {
        return next(new ResourceNotFoundError('Blog not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const ok = await BlogService.remove(Number(req.params.id));
      if (!ok) {
        return next(new ResourceNotFoundError('Blog not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }
}
