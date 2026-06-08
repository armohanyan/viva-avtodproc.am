import type { NextFunction, Request, Response } from 'express';
import AuditLogService from '../services/audit-log.service';
import { SuccessHandlerUtil } from '../utils';

export default class AuditLogController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = req.query;
      const data = await AuditLogService.list({
        category: typeof q.category === 'string' ? q.category : undefined,
        action: typeof q.action === 'string' ? q.action : undefined,
        entityType: typeof q.entityType === 'string' ? q.entityType : undefined,
        entityId: typeof q.entityId === 'string' ? q.entityId : undefined,
        requestId: typeof q.requestId === 'string' ? q.requestId : undefined,
        from: typeof q.from === 'string' ? q.from : undefined,
        to: typeof q.to === 'string' ? q.to : undefined,
        page: q.page != null ? Number(q.page) : undefined,
        pageSize: q.pageSize != null ? Number(q.pageSize) : undefined,
      });
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }
}
