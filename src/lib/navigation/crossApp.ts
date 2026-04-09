/** Normalize env-style base URL (no trailing slash). */
export function normalizeAppBase(base: string): string {
  return base.trim().replace(/\/+$/, "");
}

/** Join absolute or relative app base with a path (may include query/hash). */
export function joinAppPath(base: string, path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const b = normalizeAppBase(base);
  return b ? `${b}${p}` : p;
}
