import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function panelOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_PANEL_URL?.trim();
  if (raw) return raw.replace(/\/+$/, "");
  // Match NextAppNavigationProvider: Vite panel defaults to :5173 in local next+vite.
  if (process.env.NODE_ENV === "development") return "http://localhost:5173";
  return "";
}

/** True when `path` is `prefix` or continues under it (`/instructor/...`), not `/instructors`. */
function pathHasSegmentPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/**
 * - Canonical host: www → apex (avoid duplicate indexing).
 * - Panel routes on the marketing origin redirect to the Vite panel app.
 *
 * Important: `/instructor` (panel) must not match `/instructors` (marketing directory).
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  if (host === "www.viva-avtodproc.am") {
    const url = request.nextUrl.clone();
    url.hostname = "viva-avtodproc.am";
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }

  const pathname = request.nextUrl.pathname;
  const panel = panelOrigin();
  if (!panel) return NextResponse.next();

  const isPanelPath =
    pathHasSegmentPrefix(pathname, "/admin") ||
    pathHasSegmentPrefix(pathname, "/dashboard") ||
    pathHasSegmentPrefix(pathname, "/instructor") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathHasSegmentPrefix(pathname, "/forgot-password") ||
    pathHasSegmentPrefix(pathname, "/reset-password") ||
    pathHasSegmentPrefix(pathname, "/setup-password") ||
    pathHasSegmentPrefix(pathname, "/auth");

  if (!isPanelPath) return NextResponse.next();

  const target = new URL(`${pathname}${request.nextUrl.search}`, panel);
  if (target.origin === request.nextUrl.origin) return NextResponse.next();

  return NextResponse.redirect(target);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
