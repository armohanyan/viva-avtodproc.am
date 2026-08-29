import type { NextFunction, Response } from 'express';
import { z } from 'zod';
import type { DirectorOptionCategory } from '../constants/director-option-category';
import { DIRECTOR_OPTION_CATEGORIES } from '../constants/director-option-category';
import { DIRECTOR_PAYMENT_METHODS } from '../constants/director-payment-method';
import { parseBody, resolveBranchIdFilter } from '../helpers';
import {
  directorAmdField,
  directorCommentField,
  directorDateField,
  directorDecimalField,
  directorNullableAmdField,
  directorNullableDecimalField,
  directorOptionalIdField,
  directorPaymentField,
  directorTextField,
} from '../helpers/director-form.helper';
import type { StaffRequest } from '../middleware/staff-auth.middleware';
import DirectorService from '../services/director.service';
import { SuccessHandlerUtil } from '../utils';

const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const paymentSchema = z.enum(DIRECTOR_PAYMENT_METHODS);

function staffId(req: StaffRequest): number | undefined {
  const id = req.staff?.sub != null ? Number(req.staff.sub) : undefined;
  return Number.isFinite(id) && id! > 0 ? id : undefined;
}

async function resolveRange(req: StaffRequest) {
  const startDate = String(req.query.startDate ?? '');
  const endDate = String(req.query.endDate ?? '');
  dateRangeSchema.parse({ startDate, endDate });
  const branchId = await resolveBranchIdFilter(req);
  return { startDate, endDate, branchId };
}

export default class DirectorController {
  static async listOptions(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const category = String(req.params.category) as DirectorOptionCategory;
      if (!DIRECTOR_OPTION_CATEGORIES.includes(category)) {
        res.status(400).json({ message: 'Invalid category' });
        return;
      }
      const data = await DirectorService.listOptions(category);
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async addOption(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const category = String(req.params.category) as DirectorOptionCategory;
      const body = parseBody(z.object({ value: z.string().min(1) }), req.body);
      const data = await DirectorService.addOption(category, body.value);
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async dashboard(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const range = await resolveRange(req);
      const data = await DirectorService.dashboard(range);
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async listCash(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const data = await DirectorService.listCash(await resolveRange(req));
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async createCash(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(
        z.object({
          date: directorDateField,
          branchId: directorOptionalIdField,
          entryType: directorTextField,
          amount: directorAmdField,
          comment: directorCommentField.optional(),
        }),
        req.body,
      );
      const data = await DirectorService.createCash(body, staffId(req));
      SuccessHandlerUtil.handleAdd(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async deleteCash(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      await DirectorService.deleteCash(Number(req.params.id));
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }

  static async updateCash(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(
        z.object({
          date: directorDateField,
          branchId: directorOptionalIdField,
          entryType: directorTextField,
          amount: directorAmdField,
          comment: directorCommentField.optional(),
        }),
        req.body,
      );
      const data = await DirectorService.updateCash(Number(req.params.id), body);
      SuccessHandlerUtil.handleUpdate(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async listExpenses(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const data = await DirectorService.listExpenses(await resolveRange(req));
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async createExpense(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(
        z.object({
          date: directorDateField,
          branchId: directorOptionalIdField,
          expType: directorTextField,
          amount: directorAmdField,
          paymentMethod: directorPaymentField,
          comment: directorCommentField.optional(),
        }),
        req.body,
      );
      const data = await DirectorService.createExpense(body, staffId(req));
      SuccessHandlerUtil.handleAdd(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async deleteExpense(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      await DirectorService.deleteExpense(Number(req.params.id));
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }

  static async updateExpense(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(
        z.object({
          date: directorDateField,
          branchId: directorOptionalIdField,
          expType: directorTextField,
          amount: directorAmdField,
          paymentMethod: directorPaymentField,
          comment: directorCommentField.optional(),
        }),
        req.body,
      );
      const data = await DirectorService.updateExpense(Number(req.params.id), body);
      SuccessHandlerUtil.handleUpdate(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async expenseChart(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const data = await DirectorService.expenseChart(await resolveRange(req));
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async listRepairs(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const range = await resolveRange(req);
      const data = await DirectorService.listRepairs(range);
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async createRepair(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(
        z.object({
          date: directorDateField,
          carId: directorOptionalIdField,
          licensePlate: directorCommentField.optional(),
          workDone: directorTextField,
          amount: directorAmdField,
          paymentMethod: directorPaymentField,
          comment: directorCommentField.optional(),
        }),
        req.body,
      );
      const data = await DirectorService.createRepair(body, staffId(req));
      SuccessHandlerUtil.handleAdd(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async deleteRepair(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      await DirectorService.deleteRepair(Number(req.params.id));
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }

  static async updateRepair(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(
        z.object({
          date: directorDateField,
          carId: directorOptionalIdField,
          licensePlate: directorCommentField.optional(),
          workDone: directorTextField,
          amount: directorAmdField,
          paymentMethod: directorPaymentField,
          comment: directorCommentField.optional(),
        }),
        req.body,
      );
      const data = await DirectorService.updateRepair(Number(req.params.id), body);
      SuccessHandlerUtil.handleUpdate(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async listFuel(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const range = await resolveRange(req);
      const data = await DirectorService.listFuel(range);
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async createFuel(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(
        z.object({
          date: directorDateField,
          instructorUserId: directorOptionalIdField,
          carId: directorOptionalIdField,
          fuelType: directorTextField,
          liters: directorDecimalField,
          amount: directorAmdField,
          paymentMethod: directorPaymentField,
        }),
        req.body,
      );
      const data = await DirectorService.createFuel(body, staffId(req));
      SuccessHandlerUtil.handleAdd(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async deleteFuel(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      await DirectorService.deleteFuel(Number(req.params.id));
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }

  static async updateFuel(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(
        z.object({
          date: directorDateField,
          instructorUserId: directorOptionalIdField,
          carId: directorOptionalIdField,
          fuelType: directorTextField,
          liters: directorDecimalField,
          amount: directorAmdField,
          paymentMethod: directorPaymentField,
        }),
        req.body,
      );
      const data = await DirectorService.updateFuel(Number(req.params.id), body);
      SuccessHandlerUtil.handleUpdate(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async listKm(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const range = await resolveRange(req);
      const data = await DirectorService.listKm(range);
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async createKm(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(
        z.object({
          date: directorDateField,
          instructorUserId: directorOptionalIdField,
          km: directorDecimalField,
          comment: directorCommentField.optional(),
        }),
        req.body,
      );
      const data = await DirectorService.createKm(body, staffId(req));
      SuccessHandlerUtil.handleAdd(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async deleteKm(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      await DirectorService.deleteKm(Number(req.params.id));
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }

  static async updateKm(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(
        z.object({
          date: directorDateField,
          instructorUserId: directorOptionalIdField,
          km: directorDecimalField,
          comment: directorCommentField.optional(),
        }),
        req.body,
      );
      const data = await DirectorService.updateKm(Number(req.params.id), body);
      SuccessHandlerUtil.handleUpdate(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async listInstructorHours(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const range = await resolveRange(req);
      const data = await DirectorService.listInstructorHours(range);
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async createInstructorHours(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(
        z.object({
          date: directorDateField,
          instructorUserId: directorOptionalIdField,
          hours: directorDecimalField,
          comment: directorCommentField.optional(),
        }),
        req.body,
      );
      const data = await DirectorService.createInstructorHours(body, staffId(req));
      SuccessHandlerUtil.handleAdd(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async deleteInstructorHours(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      await DirectorService.deleteInstructorHours(Number(req.params.id));
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }

  static async updateInstructorHours(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(
        z.object({
          date: directorDateField,
          instructorUserId: directorOptionalIdField,
          hours: directorDecimalField,
          comment: directorCommentField.optional(),
        }),
        req.body,
      );
      const data = await DirectorService.updateInstructorHours(Number(req.params.id), body);
      SuccessHandlerUtil.handleUpdate(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async listSalaries(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const range = await resolveRange(req);
      const data = await DirectorService.listSalaries(range);
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async createSalary(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(
        z.object({
          date: directorDateField,
          name: directorTextField,
          role: directorTextField,
          hours: directorNullableDecimalField,
          hourlyRate: directorNullableAmdField,
          totalAmd: directorAmdField,
          comment: directorCommentField.optional(),
        }),
        req.body,
      );
      const data = await DirectorService.createSalary(body, staffId(req));
      SuccessHandlerUtil.handleAdd(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async deleteSalary(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      await DirectorService.deleteSalary(Number(req.params.id));
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }

  static async updateSalary(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(
        z.object({
          date: directorDateField,
          name: directorTextField,
          role: directorTextField,
          hours: directorNullableDecimalField,
          hourlyRate: directorNullableAmdField,
          totalAmd: directorAmdField,
          comment: directorCommentField.optional(),
        }),
        req.body,
      );
      const data = await DirectorService.updateSalary(Number(req.params.id), body);
      SuccessHandlerUtil.handleUpdate(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async listRevenues(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const range = await resolveRange(req);
      const isLegacy = req.query.isLegacy === 'true' ? true : req.query.isLegacy === 'false' ? false : undefined;
      const data = await DirectorService.listRevenues({ ...range, isLegacy });
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async revenueChart(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const range = await resolveRange(req);
      const isLegacy = req.query.isLegacy === 'true';
      const data = await DirectorService.revenueChart({ ...range, isLegacy });
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async createRevenue(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(
        z.object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          branchId: z.coerce.number().int().positive(),
          amount: z.coerce.number().int().positive(),
          paymentMethod: paymentSchema,
          isLegacy: z.boolean().optional(),
          comment: z.string().nullish(),
        }),
        req.body,
      );
      const data = await DirectorService.createRevenue(body, staffId(req));
      SuccessHandlerUtil.handleAdd(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async deleteRevenue(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      await DirectorService.deleteRevenue(Number(req.params.id));
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }

  static async driverProfile(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const range = await resolveRange(req);
      const instructorUserId = Number(req.query.instructorUserId);
      if (!Number.isFinite(instructorUserId) || instructorUserId <= 0) {
        res.status(400).json({ message: 'instructorUserId is required' });
        return;
      }
      const data = await DirectorService.driverProfile({ ...range, instructorUserId });
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }
}
