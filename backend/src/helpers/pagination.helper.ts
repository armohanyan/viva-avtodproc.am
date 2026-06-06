import type { Request } from 'express';

export type ParsedPagination = {
  page: number;
  pageSize: number;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function readQueryString(req: Request, key: string): string | undefined {
  const raw = req.query[key];
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw) && typeof raw[0] === 'string') return raw[0];
  return undefined;
}

export function parsePaginationQuery(req: Request, defaults?: Partial<ParsedPagination>): ParsedPagination {
  const pageRaw = readQueryString(req, 'page');
  const pageSizeRaw = readQueryString(req, 'pageSize');
  const pageParsed = pageRaw != null ? Math.floor(Number(pageRaw)) : NaN;
  const pageSizeParsed = pageSizeRaw != null ? Math.floor(Number(pageSizeRaw)) : NaN;
  const page =
    Number.isFinite(pageParsed) && pageParsed > 0 ? pageParsed : (defaults?.page ?? DEFAULT_PAGE);
  const pageSize =
    Number.isFinite(pageSizeParsed) && pageSizeParsed > 0
      ? Math.min(MAX_PAGE_SIZE, pageSizeParsed)
      : (defaults?.pageSize ?? DEFAULT_PAGE_SIZE);
  return { page, pageSize };
}

export function paginationRequested(req: Request): boolean {
  return readQueryString(req, 'page') != null || readQueryString(req, 'pageSize') != null;
}
