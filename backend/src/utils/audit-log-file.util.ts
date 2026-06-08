import fs from 'node:fs';
import path from 'node:path';
import config from '../config';

export type AuditLogSeverity = 'info' | 'warn' | 'error';

export type AuditLogFileEntry = {
  timestamp: string;
  requestId: string | null;
  category: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  actorUserId: number | null;
  actorType: string | null;
  severity: AuditLogSeverity;
  message: string;
  details: Record<string, unknown> | null;
  ip: string | null;
};

function baseLogDir(): string {
  const raw = config.LOG_DIR?.trim() || 'logs';
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
}

export function auditLogDirectory(): string {
  return path.join(baseLogDir(), 'audit');
}

function dateIsoUtc(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function auditFilePathForDate(dateIso: string): string {
  return path.join(auditLogDirectory(), `audit-${dateIso}.log`);
}

function ensureAuditDir(): void {
  const dir = auditLogDirectory();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function appendAuditLogEntry(entry: AuditLogFileEntry): void {
  ensureAuditDir();
  const line = `${JSON.stringify(entry)}\n`;
  fs.appendFileSync(auditFilePathForDate(entry.timestamp.slice(0, 10)), line, 'utf8');
}

function parseAuditLine(line: string): AuditLogFileEntry | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const o = JSON.parse(trimmed) as AuditLogFileEntry;
    if (!o.timestamp || !o.category || !o.action || !o.message) return null;
    return o;
  } catch {
    return null;
  }
}

function datesBetween(fromIso: string, toIso: string): string[] {
  const out: string[] = [];
  const start = Date.parse(`${fromIso.slice(0, 10)}T00:00:00.000Z`);
  const end = Date.parse(`${toIso.slice(0, 10)}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return [dateIsoUtc()];
  for (let t = start; t <= end; t += 86400000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out.length > 0 ? out : [dateIsoUtc()];
}

function listAuditLogFiles(): string[] {
  const dir = auditLogDirectory();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^audit-\d{4}-\d{2}-\d{2}\.log$/.test(f))
    .sort()
    .reverse();
}

export function readAuditLogEntries(opts: {
  category?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  requestId?: string;
  from?: string;
  to?: string;
}): AuditLogFileEntry[] {
  const dir = auditLogDirectory();
  if (!fs.existsSync(dir)) return [];

  let files: string[];
  if (opts.from?.trim() || opts.to?.trim()) {
    const from = opts.from?.trim().slice(0, 10) ?? dateIsoUtc();
    const to = opts.to?.trim().slice(0, 10) ?? from;
    files = datesBetween(from, to).map((d) => `audit-${d}.log`);
  } else {
    files = listAuditLogFiles();
  }

  const matches = (e: AuditLogFileEntry): boolean => {
    if (opts.category?.trim() && e.category !== opts.category.trim()) return false;
    if (opts.action?.trim() && e.action !== opts.action.trim()) return false;
    if (opts.entityType?.trim() && e.entityType !== opts.entityType.trim()) return false;
    if (opts.entityId?.trim() && e.entityId !== opts.entityId.trim()) return false;
    if (opts.requestId?.trim() && e.requestId !== opts.requestId.trim()) return false;
    return true;
  };

  const entries: AuditLogFileEntry[] = [];
  for (const file of files) {
    const full = path.join(dir, file);
    if (!fs.existsSync(full)) continue;
    const content = fs.readFileSync(full, 'utf8');
    for (const line of content.split('\n')) {
      const e = parseAuditLine(line);
      if (e && matches(e)) entries.push(e);
    }
  }

  entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return entries;
}

/** Delete audit files older than retention (best-effort, runs at most once per process day). */
let lastRetentionSweep = '';

export function sweepOldAuditLogFiles(retentionDays: number): void {
  const today = dateIsoUtc();
  if (lastRetentionSweep === today) return;
  lastRetentionSweep = today;

  const dir = auditLogDirectory();
  if (!fs.existsSync(dir)) return;

  const cutoff = Date.now() - retentionDays * 86400000;
  for (const file of fs.readdirSync(dir)) {
    const m = /^audit-(\d{4}-\d{2}-\d{2})\.log$/.exec(file);
    if (!m) continue;
    const t = Date.parse(`${m[1]}T00:00:00.000Z`);
    if (Number.isFinite(t) && t < cutoff) {
      try {
        fs.unlinkSync(path.join(dir, file));
      } catch {
        // ignore
      }
    }
  }
}
