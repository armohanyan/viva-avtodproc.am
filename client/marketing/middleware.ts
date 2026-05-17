import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function panelOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_PANEL_URL?.trim();
  if (raw) return raw.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "development") return "http://localhost:3000";
  return "";
}

/**
 * Admin / instructor / student panel routes are served by the Vite app (`client/app`).
 * Visiting them on the marketing origin (e.g. port 5173 in dev) would 404 — redirect to the panel.
 */
export function middleware(request: NextRequest) {
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
    "/admin/:path*",
    "/dashboard/:path*",
    "/instructor/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/setup-password",
    "/auth/:path*",
  ],
};
