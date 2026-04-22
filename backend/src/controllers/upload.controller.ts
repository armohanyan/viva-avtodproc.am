import type { NextFunction, Request, Response } from 'express';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { InputValidationError } = ErrorsUtil;

export default class UploadController {
  /** Persists one image under `/upload/…` and returns its public URL. */
  static staffImage(req: Request, res: Response, next: NextFunction): void {
    try {
      const file = req.file;
      if (!file?.filename) {
        return next(new InputValidationError('No file uploaded', HttpStatusCodesUtil.BAD_REQUEST));
      }
      /** Path-only so any marketing origin (Next :3000, Vite :5173) can proxy `/upload`. */
      const url = `/upload/${file.filename}`;
      res.status(HttpStatusCodesUtil.CREATED).json({ url });
    } catch (e) {
      next(e);
    }
  }
}
