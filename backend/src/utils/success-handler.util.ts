import type { Response, NextFunction } from 'express';
import ErrorsUtil from './errors.util';
import HttpStatusCodesUtil from './http-status-codes.util';

const { ResourceNotFoundError } = ErrorsUtil;

export default class SuccessHandlerUtil {
  static handleTokenVerification(response: Response, _next: NextFunction, data: unknown): void {
    this.sendResponse(response, HttpStatusCodesUtil.OK, data);
  }

  private static sendResponse(response: Response, status: number, data?: unknown): void {
    if (data === undefined) {
      response.sendStatus(status);
      return;
    }
    response.status(status).json(data);
  }

  static handleList(response: Response, _next: NextFunction, data: unknown[]): void {
    this.sendResponse(response, HttpStatusCodesUtil.OK, data);
  }

  static handleAdd(response: Response, _next: NextFunction, data?: unknown): void {
    if (data === undefined) {
      response.sendStatus(HttpStatusCodesUtil.NO_CONTENT);
      return;
    }
    this.sendResponse(response, HttpStatusCodesUtil.CREATED, data);
  }

  static handleGet(response: Response, next: NextFunction, data?: unknown): void {
    if (data === undefined || data === null) {
      return next(
        new ResourceNotFoundError('The specified resource is not found.', HttpStatusCodesUtil.NOT_FOUND),
      );
    }
    this.sendResponse(response, HttpStatusCodesUtil.OK, data);
  }

  static handleUpdate(response: Response, _next: NextFunction, data?: unknown): void {
    if (data === undefined) {
      response.sendStatus(HttpStatusCodesUtil.NO_CONTENT);
      return;
    }
    this.sendResponse(response, HttpStatusCodesUtil.OK, data);
  }
}
