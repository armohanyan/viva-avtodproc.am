import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody } from '../helpers';
import StudentInvitationService from '../services/student-invitation.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { InputValidationError } = ErrorsUtil;

const inviteSchema = z.object({
  studentUserId: z.coerce.number().int().positive(),
});

export default class AdminInviteController {
  static async inviteStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentUserId } = parseBody(inviteSchema, req.body);

      const result = await StudentInvitationService.createAndEmailInvite(studentUserId);
      if (!result.ok) {
        return next(new InputValidationError(result.message, HttpStatusCodesUtil.BAD_REQUEST));
      }

      SuccessHandlerUtil.handleAdd(res, next, { sent: true });
    } catch (e) {
      next(e);
    }
  }
}
