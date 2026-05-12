/**
 * Top-level route classification for the combined marketing + panel app.
 *
 * Rules are intentionally boring:
 * - Strip query string, normalize slashes.
 * - Read only the **first path segment** (the word between the first and second `/`).
 * - `instructor` → instructor panel; `instructors` → marketing (public directory). No substring tricks.
 *
 * Add new panel roots here when you introduce new first segments — do not scatter `startsWith` checks.
 */

export type AppShell = "marketing" | "admin" | "instructor" | "student" | "auth";

const ADMIN_FIRST_SEGMENTS = new Set(["admin", "super-admin", "superadmin"]);

/** Path only, trimmed trailing slashes, leading `/`, query stripped. */
export function normalizeClientPathname(pathname: string | null | undefined): string {
  if (pathname == null) return "/";
  const s = typeof pathname === "string" ? pathname : String(pathname);
  const raw = (s.split("?")[0] ?? s).trim();
  if (!raw) return "/";
  const tildeStripped = raw.startsWith("~") ? raw.slice(1) : raw;
  const withSlash = tildeStripped.startsWith("/") ? tildeStripped : `/${tildeStripped}`;
  const collapsed = withSlash.replace(/\/{2,}/g, "/");
  if (collapsed === "/") return "/";
  const noTrail = collapsed.replace(/\/+$/, "");
  return noTrail === "" ? "/" : noTrail;
}

function firstSegment(pathname: string | null | undefined): string | null {
  const p = normalizeClientPathname(pathname);
  if (p === "/") return null;
  const seg = p.slice(1).split("/").filter(Boolean)[0];
  return seg ?? null;
}

export function resolveAppShell(pathname: string | null | undefined): AppShell {
  const seg = firstSegment(pathname);
  if (!seg) return "marketing";
  if (seg === "auth") return "auth";
  if (ADMIN_FIRST_SEGMENTS.has(seg)) return "admin";
  if (seg === "dashboard") return "student";
  if (seg === "instructor") return "instructor";
  return "marketing";
}

/**
 * `path` equals `prefix` or continues under it with a `/` segment boundary
 * (e.g. prefix `/admin/learn` matches `/admin/learn/123`, not `/admin/learned`).
 */
export function pathHasPrefix(path: string | null | undefined, prefix: string | null | undefined): boolean {
  const p = normalizeClientPathname(path);
  const pre = normalizeClientPathname(prefix);
  if (pre === "/") return true;
  return p === pre || p.startsWith(`${pre}/`);
}
