import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLang } from "../lib/i18n";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { ChevronDown, Menu } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import LangToggle from "./LangToggle";
import { PUBLIC_NAV_LINKS } from "src/modules/public/public.consts";
import { DASHBOARD_NAV_LINKS } from "src/modules/dashboard/dashboard.consts";
import { ADMIN_NAV_LINKS } from "src/modules/admin/admin.consts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { cn } from "src/lib/utils";

export default function Navbar() {
  const { t } = useLang();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  const isAdmin = location.startsWith("/admin");
  const isDashboard = location.startsWith("/dashboard");

  const navLinks = PUBLIC_NAV_LINKS.map((link) => ({ href: link.href, label: t(link.translationKey) }));
  const publicRootLinks = navLinks.filter((link) => link.href === "/" || link.href === "/about" || link.href === "/contact");
  const offerLinks = navLinks.filter((link) => link.href === "/packages" || link.href === "/services");
  const learnLinks = navLinks.filter((link) => link.href === "/exam-tests" || link.href === "/instructors");

  const dashLinks = DASHBOARD_NAV_LINKS.map((link) => ({ href: link.href, label: t(link.translationKey) }));

  const adminLinks = ADMIN_NAV_LINKS.map((link) => ({ href: link.href, label: t(link.translationKey) }));

  const links = isAdmin ? adminLinks : isDashboard ? dashLinks : navLinks;
  const isPublic = !isDashboard && !isAdmin;
  const isOfferActive = offerLinks.some((link) => location === link.href);
  const isLearnActive = learnLinks.some((link) => location === link.href);

  return (
    <nav className="sticky top-0 z-50 bg-background border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center gap-4 min-w-0 md:gap-6 lg:gap-8">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
              <img src="/logo.jpg" alt={t("brandName")} className="w-7 h-7 object-contain" />
            </div>
          </Link>

          <div className="hidden lg:flex flex-1 min-w-0 items-center gap-3 lg:gap-4">
            <div className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain scroll-pl-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-h-16 w-max max-w-none items-center justify-start gap-1 pr-2">
                {isPublic ? (
                  <>
                    {publicRootLinks.slice(0, 2).map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        className={`shrink-0 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium leading-tight transition-colors lg:px-2.5 ${
                          location === l.href
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                      >
                        {l.label}
                      </Link>
                    ))}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium leading-tight transition-colors lg:px-2.5",
                            isOfferActive
                              ? "text-primary bg-primary/10"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent"
                          )}
                        >
                          {t("offer")}
                          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-44">
                        {offerLinks.map((link) => (
                          <DropdownMenuItem key={link.href} asChild>
                            <Link href={link.href} className="w-full cursor-pointer">
                              {link.label}
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium leading-tight transition-colors lg:px-2.5",
                            isLearnActive
                              ? "text-primary bg-primary/10"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent"
                          )}
                        >
                          {t("learn")}
                          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-44">
                        {learnLinks.map((link) => (
                          <DropdownMenuItem key={link.href} asChild>
                            <Link href={link.href} className="w-full cursor-pointer">
                              {link.label}
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {publicRootLinks.slice(2).map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        className={`shrink-0 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium leading-tight transition-colors lg:px-2.5 ${
                          location === l.href
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                      >
                        {l.label}
                      </Link>
                    ))}
                  </>
                ) : (
                  links.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className={`shrink-0 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium leading-tight transition-colors lg:px-2.5 ${
                        location === l.href
                          ? "text-primary bg-primary/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      }`}
                    >
                      {l.label}
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 border-l border-border pl-2 sm:gap-3 sm:pl-3">
              <LangToggle />
              <ThemeToggle />
              {!isDashboard && !isAdmin && (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm">{t("login")}</Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground whitespace-nowrap">
                      {t("register")}
                    </Button>
                  </Link>
                </>
              )}
              {(isDashboard || isAdmin) && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-primary font-semibold text-sm">
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
            <SheetContent side="right" className="w-[86vw] max-w-[22rem] p-0">
              <div className="flex h-full flex-col pt-12">
                <div className="border-b border-border px-4 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                      <img src="/logo.jpg" alt={t("brandName")} className="w-6 h-6 object-contain" />
                    </div>
                    <span className="font-semibold text-foreground">{t("brandName")}</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-3 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 pb-2">
                    Navigation
                  </div>
                  <div className="flex flex-col gap-1">
                {isPublic ? (
                  <>
                    {publicRootLinks.slice(0, 2).map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        onClick={() => setOpen(false)}
                        className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          location === l.href ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                      >
                        {l.label}
                      </Link>
                    ))}

                    {offerLinks.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        onClick={() => setOpen(false)}
                        className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          location === l.href ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                      >
                        {l.label}
                      </Link>
                    ))}

                    {learnLinks.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        onClick={() => setOpen(false)}
                        className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          location === l.href ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                      >
                        {l.label}
                      </Link>
                    ))}

                    {publicRootLinks.slice(2).map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        onClick={() => setOpen(false)}
                        className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          location === l.href ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                      >
                        {l.label}
                      </Link>
                    ))}
                  </>
                ) : (
                  links.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        location === l.href ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      }`}
                    >
                      {l.label}
                    </Link>
                  ))
                )}
                  </div>
                </div>
                <div className="border-t border-border p-4 space-y-3 bg-background/60">
                  <div className="flex items-center gap-2 rounded-lg bg-accent/50 p-2">
                    <LangToggle />
                    <ThemeToggle />
                  </div>
                  {!isDashboard && !isAdmin && (
                    <div className="flex flex-col gap-3">
                      <Link href="/login" onClick={() => setOpen(false)}>
                        <Button variant="outline" className="w-full">{t("login")}</Button>
                      </Link>
                      <Link href="/register" onClick={() => setOpen(false)}>
                        <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">{t("register")}</Button>
                      </Link>
                    </div>
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
