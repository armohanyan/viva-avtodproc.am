import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLang } from "../lib/i18n";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Menu, Car } from "lucide-react";
import LangToggle from "./LangToggle";
import { PUBLIC_NAV_LINKS } from "@/modules/public/public.consts";
import { DASHBOARD_NAV_LINKS } from "@/modules/dashboard/dashboard.consts";
import { ADMIN_NAV_LINKS } from "@/modules/admin/admin.consts";

export default function Navbar() {
  const { t } = useLang();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  const isAdmin = location.startsWith("/admin");
  const isDashboard = location.startsWith("/dashboard");

  const navLinks = PUBLIC_NAV_LINKS.map((link) => ({ href: link.href, label: t(link.translationKey) }));

  const dashLinks = DASHBOARD_NAV_LINKS.map((link) => ({ href: link.href, label: t(link.translationKey) }));

  const adminLinks = ADMIN_NAV_LINKS.map((link) => ({ href: link.href, label: t(link.translationKey) }));

  const links = isAdmin ? adminLinks : isDashboard ? dashLinks : navLinks;

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center gap-4 min-w-0 md:gap-6 lg:gap-8">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <Car className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-base sm:text-lg text-slate-900 whitespace-nowrap">Viva Drive</span>
          </Link>

          <div className="hidden lg:flex flex-1 min-w-0 items-center gap-3 lg:gap-4">
            <div className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain scroll-pl-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-h-16 w-max max-w-none items-center justify-start gap-1 pr-2">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`shrink-0 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium leading-tight transition-colors lg:px-2.5 ${
                      location === l.href
                        ? "text-blue-600 bg-blue-50"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 border-l border-slate-100 pl-2 sm:gap-3 sm:pl-3">
              <LangToggle />
              {!isDashboard && !isAdmin && (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm">{t("login")}</Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap">
                      {t("register")}
                    </Button>
                  </Link>
                </>
              )}
              {(isDashboard || isAdmin) && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                    A
                  </div>
                  <Link href="/">
                    <Button variant="ghost" size="sm">{t("logout")}</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="lg:hidden ml-auto shrink-0">
              <Button variant="ghost" size="sm" aria-label={t("openMenu")}>
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="flex flex-col gap-1 mt-6">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      location === l.href ? "text-blue-600 bg-blue-50" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {l.label}
                  </Link>
                ))}
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                  <LangToggle />
                  {!isDashboard && !isAdmin && (
                    <>
                      <Link href="/login" onClick={() => setOpen(false)}>
                        <Button variant="outline" className="w-full">{t("login")}</Button>
                      </Link>
                      <Link href="/register" onClick={() => setOpen(false)}>
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">{t("register")}</Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
