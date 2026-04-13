import type { Request, Response, NextFunction } from 'express';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';
import { UserService } from '../services';

const { ResourceNotFoundError } = ErrorsUtil;

export default class UserController {
  static async getUser(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await UserService.listUsers();
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (error) {
      next(error);
    }
  }

  static async addUser(req: Request, res: Response, next: NextFunction) {
    try {
      const created = await UserService.addUser(req.body);
      if (!created) {
        return next(new ResourceNotFoundError('Could not create user', HttpStatusCodesUtil.BAD_REQUEST));
      }
      SuccessHandlerUtil.handleAdd(res, next, created);
    } catch (error) {
      next(error);
    }
  }
}
