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

const localizedTextSchema = z.union([
  z.string(),
  z.object({
    am: z.string(),
    ru: z.string(),
    en: z.string(),
  }),
]);

const siteContentSchema = z.object({
  homeHeroBackgroundImage: z.string(),
  ownerPhoto: z.string(),
  homeIntroTitle: localizedTextSchema,
  homeIntroDescription: localizedTextSchema,
  ownerName: localizedTextSchema,
  ownerPosition: localizedTextSchema,
  ownerDescription: localizedTextSchema,
});

const replaceSettingsSchema = z.object({
  contact: contactSchema,
  footer: footerSchema,
  social: socialSchema,
  siteContent: siteContentSchema,
});

function normalizeLocalizedTextInput(v: z.infer<typeof localizedTextSchema>): { am: string; ru: string; en: string } {
  if (typeof v === 'string') {
    return { am: v, ru: v, en: v };
  }
  return v;
}

const testimonialCreateSchema = z.object({
  authorName: localizedTextSchema,
  quote: localizedTextSchema,
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
      const normalizedBody = {
        ...body,
        siteContent: {
          ...body.siteContent,
          homeIntroTitle: normalizeLocalizedTextInput(body.siteContent.homeIntroTitle),
          homeIntroDescription: normalizeLocalizedTextInput(body.siteContent.homeIntroDescription),
          ownerName: normalizeLocalizedTextInput(body.siteContent.ownerName),
          ownerPosition: normalizeLocalizedTextInput(body.siteContent.ownerPosition),
          ownerDescription: normalizeLocalizedTextInput(body.siteContent.ownerDescription),
        },
      };
      const data = await MarketingService.replaceSettings(normalizedBody);
      res.status(HttpStatusCodesUtil.OK).json(data);
    } catch (e) {
      next(e);
    }
  }

  static async createTestimonial(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(testimonialCreateSchema, req.body);
      const row = await MarketingService.createTestimonial({
        ...body,
        authorName: normalizeLocalizedTextInput(body.authorName),
        quote: normalizeLocalizedTextInput(body.quote),
      });
      SuccessHandlerUtil.handleAdd(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async updateTestimonial(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(testimonialUpdateSchema, req.body);
      const patch: Parameters<typeof MarketingService.updateTestimonial>[1] = {};
      if (body.rating !== undefined) patch.rating = body.rating;
      if (body.sortOrder !== undefined) patch.sortOrder = body.sortOrder;
      if (body.published !== undefined) patch.published = body.published;
      if (body.authorName !== undefined) patch.authorName = normalizeLocalizedTextInput(body.authorName);
      if (body.quote !== undefined) patch.quote = normalizeLocalizedTextInput(body.quote);
      const row = await MarketingService.updateTestimonial(Number(req.params.id), patch);
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
      const ok = await MarketingService.removeTestimonial(Number(req.params.id));
      if (!ok) {
        return next(new ResourceNotFoundError('Testimonial not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      res.sendStatus(HttpStatusCodesUtil.NO_CONTENT);
    } catch (e) {
      next(e);
    }
  }
}
