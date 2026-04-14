import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody } from '../helpers';
import MarketingService from '../services/marketing.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { ResourceNotFoundError } = ErrorsUtil;

const statKeySchema = z.enum(['years_exp', 'students', 'instructors', 'success_rate']);

const replaceStatsSchema = z.object({
  stats: z.array(
    z.object({
      key: statKeySchema,
      value: z.string().min(1).max(64),
      sortOrder: z.number().int().nonnegative().optional(),
    }),
  ),
});

const contactSchema = z.object({
  phones: z.array(z.string()),
  emails: z.array(z.string()),
  hoursWeekdays: z.string(),
  hoursSaturday: z.string(),
  primaryTelHref: z.string(),
  primaryMailtoHref: z.string(),
});

const footerSchema = z.object({
  addressLine1: z.string(),
  addressLine2: z.string(),
});

const socialSchema = z.object({
  facebook: z.string(),
  instagram: z.string(),
  youtube: z.string(),
  tiktok: z.string(),
  whatsapp: z.string(),
});

const replaceSettingsSchema = z.object({
  contact: contactSchema,
  footer: footerSchema,
  social: socialSchema,
});

const testimonialCreateSchema = z.object({
  authorName: z.string().min(1),
  quote: z.string().min(1),
  rating: z.number().int().min(1).max(5).optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  published: z.boolean().optional(),
});

const testimonialUpdateSchema = testimonialCreateSchema.partial();

export default class MarketingController {
  static async publicBundle(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MarketingService.getPublicBundle();
      res.status(HttpStatusCodesUtil.OK).json(data);
    } catch (e) {
      next(e);
    }
  }

  static async adminBundle(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MarketingService.getAdminBundle();
      res.status(HttpStatusCodesUtil.OK).json(data);
    } catch (e) {
      next(e);
    }
  }

  static async replaceStats(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(replaceStatsSchema, req.body);
      const stats = await MarketingService.replaceStats(body.stats);
      SuccessHandlerUtil.handleList(res, next, stats);
    } catch (e) {
      next(e);
    }
  }

  static async replaceSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(replaceSettingsSchema, req.body);
      const data = await MarketingService.replaceSettings(body);
      res.status(HttpStatusCodesUtil.OK).json(data);
    } catch (e) {
      next(e);
    }
  }

  static async createTestimonial(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(testimonialCreateSchema, req.body);
      const row = await MarketingService.createTestimonial(body);
      SuccessHandlerUtil.handleAdd(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async updateTestimonial(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(testimonialUpdateSchema, req.body);
      const row = await MarketingService.updateTestimonial(req.params.id!, body);
      if (!row) {
        return next(new ResourceNotFoundError('Testimonial not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async removeTestimonial(req: Request, res: Response, next: NextFunction) {
    try {
      const ok = await MarketingService.removeTestimonial(req.params.id!);
      if (!ok) {
        return next(new ResourceNotFoundError('Testimonial not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      res.sendStatus(HttpStatusCodesUtil.NO_CONTENT);
    } catch (e) {
      next(e);
    }
  }
}
