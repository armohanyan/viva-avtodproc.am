import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function panelOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_PANEL_URL?.trim();
  if (raw) return raw.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "development") return "http://localhost:3000";
  return "";
}

/**
 * - Canonical host: www → apex (avoid duplicate indexing).
 * - Panel routes on the marketing origin redirect to the Vite panel app.
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
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/instructor") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/setup-password") ||
    pathname.startsWith("/auth/");

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
