import { Router } from 'express';
import multer from 'multer';
import UploadController from '../controllers/upload.controller';
import { requireStaffOrInstructor } from '../middleware/staff-auth.middleware';
import { staffImageUploadSingle } from '../middleware/upload-image.middleware';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { InputValidationError } = ErrorsUtil;
const router = Router();

router.post(
  '/image',
  requireStaffOrInstructor,
  (req, res, next) => {
    staffImageUploadSingle(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new InputValidationError('File too large', HttpStatusCodesUtil.BAD_REQUEST));
        }
        return next(new InputValidationError(err.message, HttpStatusCodesUtil.BAD_REQUEST));
      }
      if (err) return next(err);
      UploadController.staffImage(req, res, next);
    });
  },
);

export default router;
