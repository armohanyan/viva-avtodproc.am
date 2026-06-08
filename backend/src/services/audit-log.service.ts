import LoggerUtil from '../utils/logger.util';
import {
  appendAuditLogEntry,
  readAuditLogEntries,
  sweepOldAuditLogFiles,
  type AuditLogFileEntry,
  type AuditLogSeverity,
} from '../utils/audit-log-file.util';
import { getRequestContext } from '../utils/request-context.util';
import config from '../config';

export type { AuditLogSeverity };

export type AuditRecordInput = {
  category: string;
  action: string;
  message: string;
  entityType?: string | null;
  entityId?: string | number | null;
  severity?: AuditLogSeverity;
  details?: Record<string, unknown> | null;
  actorUserId?: number | null;
  actorType?: string | null;
  requestId?: string | null;
  ip?: string | null;
};

export type AuditLogListQuery = {
  category?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  requestId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

function trimMessage(msg: string): string {
  const s = msg.trim();
  return s.length <= 512 ? s : `${s.slice(0, 509)}...`;
}

function sanitizeDetails(details: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!details || typeof details !== 'object') return null;
  try {
    const raw = JSON.stringify(details);
    if (raw.length <= 65000) return details;
    return { truncated: true, preview: raw.slice(0, 4000) };
  } catch {
    return { truncated: true };
  }
}

export default class AuditLogService {
  static async record(input: AuditRecordInput): Promise<void> {
    const ctx = getRequestContext();
    const entry: AuditLogFileEntry = {
      timestamp: new Date().toISOString(),
      requestId: input.requestId ?? ctx?.requestId ?? null,
      category: input.category.slice(0, 64),
      action: input.action.slice(0, 64),
      entityType: input.entityType?.slice(0, 64) ?? null,
      entityId: input.entityId != null ? String(input.entityId).slice(0, 64) : null,
      actorUserId: input.actorUserId ?? ctx?.actorUserId ?? null,
      actorType: input.actorType ?? ctx?.actorType ?? null,
      severity: input.severity ?? 'info',
      message: trimMessage(input.message),
      details: sanitizeDetails(input.details),
      ip: input.ip ?? ctx?.ip ?? null,
    };

    appendAuditLogEntry(entry);

    const level = entry.severity === 'error' ? 'error' : entry.severity === 'warn' ? 'warn' : 'info';
    LoggerUtil.log(level, entry.message, {
      kind: 'audit',
      category: entry.category,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      severity: entry.severity,
      auditFile: `audit/audit-${entry.timestamp.slice(0, 10)}.log`,
    });

    sweepOldAuditLogFiles(config.AUDIT_LOG_RETENTION_DAYS);
  }

  static recordFireAndForget(input: AuditRecordInput): void {
    void AuditLogService.record(input).catch((e) => {
      LoggerUtil.error(`AuditLogService.record failed: ${e instanceof Error ? e.message : String(e)}`, {
        category: input.category,
        action: input.action,
      });
    });
  }

  static async list(query: AuditLogListQuery): Promise<{
    items: AuditLogFileEntry[];
    total: number;
    page: number;
    pageSize: number;
    logDirectory: string;
  }> {
    const page = Math.max(1, Math.floor(query.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Math.floor(query.pageSize ?? 50)));

    const all = readAuditLogEntries({
      category: query.category,
      action: query.action,
      entityType: query.entityType,
      entityId: query.entityId,
      requestId: query.requestId,
      from: query.from,
      to: query.to,
    });

    const offset = (page - 1) * pageSize;
    return {
      items: all.slice(offset, offset + pageSize),
      total: all.length,
      page,
      pageSize,
      logDirectory: 'logs/audit/',
    };
  }
}
