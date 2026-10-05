import type { Request } from 'express';
import { z } from 'zod';
import { resolveBranchIdFilter } from './branch-filter.helper';

const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** Optional `?adminUserId=` for kassa admin-scoped KPIs (omitted / `all` / invalid → no filter). */
export function parseAdminUserIdQuery(req: Request): number | undefined {
  const raw = req.query.adminUserId;
  const s =
    typeof raw === 'string' ? raw : Array.isArray(raw) && typeof raw[0] === 'string' ? raw[0] : undefined;
  if (!s) return undefined;
  const trimmed = s.trim();
  if (!trimmed || trimmed.toLowerCase() === 'all') return undefined;
  const n = Math.floor(Number(trimmed));
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

export async function resolveDirectorCashRangeFromRequest(req: Request): Promise<{
  startDate: string;
  endDate: string;
  branchId?: number;
}> {
  const startDate = String(req.query.startDate ?? '');
  const endDate = String(req.query.endDate ?? '');
  dateRangeSchema.parse({ startDate, endDate });
  const branchId = await resolveBranchIdFilter(req);
  return { startDate, endDate, branchId };
}
