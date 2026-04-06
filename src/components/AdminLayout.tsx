import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useLang } from "../lib/i18n";
import { useToast } from "../lib/toast";
import {
  LayoutDashboard,
  Car,
  Calendar,
  Newspaper,
  LogOut,
  Menu,
  Bell,
  Shield,
  GraduationCap,
  UserCog,
  Settings,
  MapPin,
  CarFront,
  Landmark,
  School,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Button } from "./ui/button";
import ThemeToggle from "./ThemeToggle";
import { ADMIN_NAV_LINKS } from "src/modules/admin/admin.consts";
import type { AdminNavigationLink } from "src/modules/admin/admin.types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface Props { children: ReactNode; }

export default function AdminLayout({ children }: Props) {
  const { t } = useLang();
  const { showToast } = useToast();
  const [location, setLocation] = useLocation();
  
  const [open, setOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Admin pages render into a scrollable <main> container.
    // Reset it on route changes so the user doesn't land at the previous page's bottom.
    mainRef.current?.scrollTo(0, 0);
  }, [location]);

  const iconByPath = {
    "/admin/dashboard": LayoutDashboard,
    "/admin/branches": MapPin,
    "/admin/cars": CarFront,
    "/admin/bookings": Calendar,
    "/admin/learn": School,
    "/admin/instructors": Car,
    "/admin/users": GraduationCap,
    "/admin/finance": Landmark,
    "/admin/blogs": Newspaper,
    "/admin/accounts": UserCog,
  } as const;

  const adminNavLabels = useMemo(() => {
    const entries: { href: string; label: string }[] = [];
    for (const link of ADMIN_NAV_LINKS) {
      entries.push({ href: link.href, label: t(link.translationKey) });
      if (link.children) {
        for (const c of link.children) {
          entries.push({ href: c.href, label: t(c.translationKey) });
        }
      }
    }
    return entries;
  }, [t]);

  const renderAdminNavItem = (link: AdminNavigationLink) => {
    const Icon = iconByPath[link.href as keyof typeof iconByPath];
    const onLearnHub = location === "/admin/learn";
    const underLearn = location.startsWith("/admin/learn/");
    const hasChildren = Boolean(link.children?.length);

    if (!hasChildren) {
      const active = location === link.href;
      return (
        <Link
          key={link.href}
          href={link.href}
          onClick={() => setOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            active
              ? "bg-primary text-primary-foreground"
              : "text-hero-foreground/80 hover:bg-white/10 hover:text-hero-foreground"
          }`}
        >
          <Icon className="w-4 h-4 shrink-0" />
          {t(link.translationKey)}
        </Link>
      );
    }

    const parentSoft = underLearn && !onLearnHub;
    const parentStrong = onLearnHub;

    return (
      <div key={link.href} className="space-y-0.5">
        <Link
          href={link.href}
          onClick={() => setOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            parentStrong
              ? "bg-primary text-primary-foreground"
              : parentSoft
                ? "bg-white/10 text-hero-foreground"
                : "text-hero-foreground/80 hover:bg-white/10 hover:text-hero-foreground"
          }`}
        >
          <Icon className="w-4 h-4 shrink-0" />
          {t(link.translationKey)}
        </Link>
        <div className="ml-3 pl-3 border-l border-white/15 space-y-0.5">
          {link.children!.map((child) => {
            const childActive = location === child.href;
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  childActive
                    ? "bg-primary text-primary-foreground"
                    : "text-hero-foreground/80 hover:bg-white/10 hover:text-hero-foreground"
                }`}
              >
                {t(child.translationKey)}
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  const handleLogout = () => {
    showToast(t("logoutSuccess"), "info");
    setTimeout(() => setLocation("/"), 800);
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full min-h-0 bg-hero">
      <div className="p-5 border-b border-border shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <img src="/logo.jpg" alt={t("brandName")} className="w-5 h-5 object-contain" />
          </div>
          <div>
            <span className="font-bold text-hero-foreground text-sm">{t("brandName")}</span>
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-primary" />
              <span className="text-xs text-primary font-medium">{t("adminSidebarRoleBadge")}</span>
            </div>
          </div>
        </Link>
      </div>
      <nav className="px-3 py-4 flex-1 min-h-0 overflow-y-auto space-y-1">
        {ADMIN_NAV_LINKS.map((link) => renderAdminNavItem(link))}
      </nav>
    </div>
  );

  const UserMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={t("profile")}
        >
          SA
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium text-foreground truncate">{t("roleLabelSuperAdmin")}</p>
          <p className="text-xs text-muted-foreground truncate">admin@vivadrive.am</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/admin/profile" className="cursor-pointer" onClick={() => setOpen(false)}>
            <Settings className="w-4 h-4" />
            {t("profileSettings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <LogOut className="w-4 h-4" />
          {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <aside className="hidden lg:flex w-64 shrink-0 fixed inset-y-0 left-0 z-30 border-r border-border bg-hero flex-col">
        <Sidebar />
      </aside>
      <div className="flex flex-col flex-1 min-w-0 min-h-0 lg:pl-64">
        <header className="bg-card border-b border-border px-4 sm:px-6 h-16 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon-lg"><Menu className="h-6 w-6" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[86vw] max-w-[20rem] p-0 bg-hero">
                <div className="h-full pt-12 flex flex-col min-h-0">
                  <Sidebar />
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="font-semibold text-foreground text-sm truncate max-w-[45vw] sm:max-w-none">
              {location === "/admin/profile"
                ? t("adminProfileTitle")
                : location === "/admin/learn/practical"
                  ? t("adminLearnPracticalTitle")
                  : location === "/admin/learn/theory"
                    ? t("adminLearnTheoryTitle")
                    : location === "/admin/learn/groups"
                      ? t("adminSidebarGroups")
                      : location === "/admin/learn/packages"
                        ? t("packages")
                    : adminNavLabels.find((n) => n.href === location)?.label || t("adminDashboard")}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              className="relative w-9 h-9 rounded-full hover:bg-accent flex items-center justify-center"
              onClick={() => showToast(t("panelNotificationsComingSoon"), "info")}
            >
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
            </button>
            <UserMenu />
          </div>
        </header>
        <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
