import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody } from '../helpers';
import AuthService from '../services/auth.service';
import { SuccessHandlerUtil } from '../utils';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  phone: z.string().optional(),
});

export default class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(loginSchema, req.body);
      const data = await AuthService.login(body.email, body.password);
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(registerSchema, req.body);
      const data = await AuthService.register(body);
      SuccessHandlerUtil.handleAdd(res, next, data);
    } catch (e) {
      next(e);
    }
  }
}
