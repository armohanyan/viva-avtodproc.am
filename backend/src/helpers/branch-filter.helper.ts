import type { Request } from 'express';
import type { WhereOptions } from 'sequelize';
import { Branch } from '../models';

/** Parsed optional branch filter from `?branchId=` (omitted / `all` / invalid → no filter). */
export function parseBranchIdQuery(req: Request): number | undefined {
  const raw = req.query.branchId;
  const s =
    typeof raw === 'string' ? raw : Array.isArray(raw) && typeof raw[0] === 'string' ? raw[0] : undefined;
  if (!s) return undefined;
  const trimmed = s.trim();
  if (!trimmed || trimmed.toLowerCase() === 'all') return undefined;
  const n = Math.floor(Number(trimmed));
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

/** Returns `undefined` when filter should not apply; otherwise a validated positive branch id. */
export async function resolveBranchIdFilter(req: Request): Promise<number | undefined> {
  const branchId = parseBranchIdQuery(req);
  if (branchId === undefined) return undefined;
  const count = await Branch.count({ where: { id: branchId } });
  if (count === 0) return undefined;
  return branchId;
}

export function branchIdWhere(branchId: number | undefined): WhereOptions | undefined {
  if (branchId === undefined) return undefined;
  return { branchId };
}
