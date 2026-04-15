import crypto from 'crypto';
import fs from 'fs';
import type { Request } from 'express';
import multer from 'multer';
import { STAFF_UPLOAD_DIR } from '../helpers/managed-upload.helper';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { InputValidationError } = ErrorsUtil;
const MAX_BYTES = 800 * 1024;

const ALLOWED_MIMES = new Map<string, string>([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/gif', 'gif'],
  ['image/webp', 'webp'],
]);

const storage = multer.diskStorage({
  destination: (_req: Request, _file, cb) => {
    fs.mkdirSync(STAFF_UPLOAD_DIR, { recursive: true });
    cb(null, STAFF_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = ALLOWED_MIMES.get(file.mimetype);
    const safeExt = ext ?? 'bin';
    const name = `${Date.now().toString(36)}-${crypto.randomBytes(8).toString('hex')}.${safeExt}`;
    cb(null, name);
  },
});

const multerInstance = multer({
  storage,
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIMES.has(file.mimetype)) {
      return cb(
        new InputValidationError(
          'Only PNG, JPEG, GIF, or WebP images are allowed.',
          HttpStatusCodesUtil.BAD_REQUEST,
        ),
      );
    }
    cb(null, true);
  },
});

export const staffImageUploadSingle = multerInstance.single('file');
export { MAX_BYTES as STAFF_UPLOAD_IMAGE_MAX_BYTES };
