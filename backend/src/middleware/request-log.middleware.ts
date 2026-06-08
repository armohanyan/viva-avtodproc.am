import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../helpers';
import { logHttp } from '../utils/logger.util';
import {
  getRequestContext,
  newRequestId,
  patchRequestContext,
  runWithRequestContext,
  type RequestContext,
} from '../utils/request-context.util';

function clientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]?.trim() ?? null;
  }
  return req.ip ?? req.socket.remoteAddress ?? null;
}

function tryActorFromBearer(req: Request): Pick<RequestContext, 'actorUserId' | 'actorType'> {
  const raw = req.headers.authorization;
  const token = raw?.startsWith('Bearer ') ? raw.slice(7).trim() : undefined;
  if (!token) {
    return { actorUserId: null, actorType: null };
  }
  try {
    const payload = verifyAccessToken(token);
    const sub = Number(payload.sub);
    return {
      actorUserId: Number.isFinite(sub) && sub > 0 ? sub : null,
      actorType: payload.accountType ?? null,
    };
  } catch {
    return { actorUserId: null, actorType: null };
  }
}

/** Correlates logs per HTTP request; logs structured access lines when the response finishes. */
export default function requestLogMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId =
    (typeof req.headers['x-request-id'] === 'string' && req.headers['x-request-id'].trim()) || newRequestId();
  res.setHeader('X-Request-Id', requestId);

  const actor = tryActorFromBearer(req);
  const ctx: RequestContext = {
    requestId,
    method: req.method,
    path: req.originalUrl || req.url,
    ip: clientIp(req),
    actorUserId: actor.actorUserId,
    actorType: actor.actorType,
  };

  const started = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - started;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logHttp(level, `${req.method} ${req.originalUrl || req.url} ${res.statusCode} ${ms}ms`, {
      statusCode: res.statusCode,
      durationMs: ms,
      contentLength: res.getHeader('content-length') ?? null,
    });
  });

  runWithRequestContext(ctx, () => next());
}

/** After auth middleware sets `req.staff`, refresh actor fields on the active request context. */
export function syncRequestActor(userId: number, accountType: string): void {
  patchRequestContext({ actorUserId: userId, actorType: accountType });
}

export function currentRequestId(): string | undefined {
  return getRequestContext()?.requestId;
}
