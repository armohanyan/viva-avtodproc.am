import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody } from '../helpers';
import FleetService from '../services/fleet.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { ResourceNotFoundError } = ErrorsUtil;

const carSchema = z.object({
  plate: z.string().min(1),
  vin: z.string().optional(),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().optional(),
  transmission: z.enum(['manual', 'automatic']).optional(),
  notes: z.string().optional(),
  assignedInstructorEmails: z.array(z.string()).optional(),
});

const carUpdateSchema = carSchema.partial();

const expenseSchema = z.object({
  carId: z.coerce.number().int().positive(),
  amount: z.number().int(),
  date: z.string().min(1),
  purpose: z.string().min(1),
  note: z.string().optional(),
  channel: z.enum(['online', 'pos', 'office', 'bank']).default('office'),
  method: z.enum(['card', 'idram', 'cash', 'transfer']).default('cash'),
});

const expenseUpdateSchema = expenseSchema.partial();

export default class FleetController {
  static async listCars(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await FleetService.listCars();
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async listExpenses(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await FleetService.listExpenses();
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async createCar(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(carSchema, req.body);
      const row = await FleetService.createCar(body);
      SuccessHandlerUtil.handleAdd(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async updateCar(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(carUpdateSchema, req.body);
      const row = await FleetService.updateCar(Number(req.params.id), body);
      if (!row) {
        return next(new ResourceNotFoundError('Car not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async removeCar(req: Request, res: Response, next: NextFunction) {
    try {
      const ok = await FleetService.removeCar(Number(req.params.id));
      if (!ok) {
        return next(new ResourceNotFoundError('Car not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }

  static async addExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(expenseSchema, req.body);
      const row = await FleetService.addExpense({
        carId: body.carId,
        amount: body.amount,
        date: body.date,
        purpose: body.purpose,
        note: body.note,
        channel: body.channel ?? 'office',
        method: body.method ?? 'cash',
      });
      SuccessHandlerUtil.handleAdd(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async updateExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(expenseUpdateSchema, req.body);
      const row = await FleetService.updateExpense(Number(req.params.id), body);
      if (!row) {
        return next(new ResourceNotFoundError('Expense not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async removeExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const ok = await FleetService.removeExpense(Number(req.params.id));
      if (!ok) {
        return next(new ResourceNotFoundError('Expense not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }
}
