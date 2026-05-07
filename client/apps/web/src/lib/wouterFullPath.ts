/**
 * Wouter nested routes: `useLocation()` is relative to `router.base`.
 * Use this to recover the real browser pathname for comparisons and redirects.
 */
export function fullBrowserPathFromRouter(router: { readonly base: string }, location: string): string {
  const base = router.base && router.base !== "/" ? router.base.replace(/\/$/, "") : "";
  if (!base) return location;
  if (location === "/" || location === "") return base;
  return `${base}${location}`;
}

/** Prefix with `~` so Link / navigate targets an absolute path (escapes nested `router.base`). */
export function absWouterHref(path: string): string {
  if (path.startsWith("~/")) return path;
  return `~${path}`;
}
