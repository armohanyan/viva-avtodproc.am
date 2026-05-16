import type { NextFunction, Request, Response } from 'express';
import { resolveBranchIdFilter, verifyAccessToken } from '../helpers';
import ClassScheduleService, { type ClassScheduleQuery } from '../services/class-schedule.service';
import type { StaffRequest } from '../middleware/staff-auth.middleware';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';
import { SuccessHandlerUtil } from '../utils';

const { PermissionError, UnauthorizedError } = ErrorsUtil;

function queryFromRequest(req: Request): ClassScheduleQuery {
  const q = req.query;
  const pick = (key: string): string | undefined => {
    const v = q[key];
    if (typeof v === 'string') return v;
    if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
    return undefined;
  };
  return {
    view: pick('view'),
    startDate: pick('startDate'),
    endDate: pick('endDate'),
    lessonType: pick('lessonType'),
    instructorId: pick('instructorId'),
    studentId: pick('studentId'),
    branchId: pick('branchId'),
    status: pick('status'),
    search: pick('search'),
    packageFilter: pick('packageFilter'),
  };
}

function readBearerToken(req: Request): string | undefined {
  const raw = req.headers.authorization;
  return raw?.startsWith('Bearer ') ? raw.slice(7).trim() : undefined;
}

function studentUserIdFromRequest(req: Request): number {
  const token = readBearerToken(req);
  if (!token) {
    throw new UnauthorizedError('Authentication required', HttpStatusCodesUtil.UNAUTHORIZED);
  }
  let payload: ReturnType<typeof verifyAccessToken>;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new UnauthorizedError('Invalid or expired token', HttpStatusCodesUtil.UNAUTHORIZED);
  }
  if (payload.accountType !== 'student') {
    throw new PermissionError('Student access required', HttpStatusCodesUtil.FORBIDDEN);
  }
  const studentUserId = Number(payload.sub);
  if (!Number.isFinite(studentUserId) || studentUserId <= 0) {
    throw new UnauthorizedError('Invalid token subject', HttpStatusCodesUtil.UNAUTHORIZED);
  }
  return studentUserId;
}

function instructorUserIdFromRequest(req: Request): number {
  const payload = (req as StaffRequest).staff;
  if (payload?.accountType !== 'instructor') {
    throw new PermissionError('Instructor access required', HttpStatusCodesUtil.FORBIDDEN);
  }
  const uid = Number(payload.sub);
  if (!Number.isFinite(uid) || uid <= 0) {
    throw new PermissionError('Invalid instructor session', HttpStatusCodesUtil.FORBIDDEN);
  }
  return uid;
}

export default class ClassScheduleController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = await resolveBranchIdFilter(req);
      const data = await ClassScheduleService.listForAdmin(queryFromRequest(req), branchId);
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async listForInstructor(req: Request, res: Response, next: NextFunction) {
    try {
      const instructorUserId = instructorUserIdFromRequest(req);
      const q = queryFromRequest(req);
      delete q.instructorId;
      delete q.studentId;
      const data = await ClassScheduleService.listForInstructor(instructorUserId, q);
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async listForStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const studentUserId = studentUserIdFromRequest(req);
      const q = queryFromRequest(req);
      delete q.instructorId;
      delete q.studentId;
      delete q.search;
      delete q.packageFilter;
      delete q.branchId;
      const data = await ClassScheduleService.listForStudent(studentUserId, q);
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }
}
