import multer from 'multer';
import type { RequestHandler } from 'express';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { InputValidationError } = ErrorsUtil;

const xlsxUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = String(file.originalname ?? '').toLowerCase();
    const ok =
      name.endsWith('.xlsx') ||
      name.endsWith('.xls') ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'application/octet-stream';
    if (!ok) {
      cb(new InputValidationError('Only .xlsx / .xls files are allowed', HttpStatusCodesUtil.BAD_REQUEST));
      return;
    }
    cb(null, true);
  },
});

const single = xlsxUpload.single('file');

/** Multer middleware that maps MulterError → InputValidationError. */
export const practicalXlsxUploadSingle: RequestHandler = (req, res, next) => {
  single(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new InputValidationError('File too large (max 25MB)', HttpStatusCodesUtil.BAD_REQUEST));
      }
      return next(new InputValidationError(err.message, HttpStatusCodesUtil.BAD_REQUEST));
    }
    if (err) return next(err);
    next();
  });
};
