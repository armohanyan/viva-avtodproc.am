import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "src/lib/utils";
import { useLang } from "../lib/i18n";
import { useToast } from "../lib/toast";
import {
  LayoutDashboard,
  Car,
  Calendar,
  Newspaper,
  LogOut,
  Menu,
  Shield,
  GraduationCap,
  UserCog,
  Settings,
  MapPin,
  CarFront,
  Landmark,
  School,
  Sparkles,
  ChevronDown,
  Users,
  PhoneCall,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Button } from "./ui/button";
import ThemeToggle from "./ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ADMIN_NAV_LINKS } from "src/modules/admin/admin.consts";
import type { AdminNavigationLink } from "src/modules/admin/admin.types";
import type { AccountType } from "src/modules/accounts";
import { useAccount } from "src/modules/accounts";
import type { TranslationKey } from "src/lib/i18n";

function panelRoleLabelKey(accountType: AccountType): TranslationKey {
  return accountType === "super_admin" ? "roleLabelSuperAdmin" : "roleAdmin";
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase() || "?";
  }
  const one = parts[0] ?? "?";
  return one.slice(0, 2).toUpperCase();
}

interface Props { children: ReactNode; }

export default function AdminLayout({ children }: Props) {
  const { t } = useLang();
  const { showToast } = useToast();
  const { user, signOut } = useAccount();
  const [location, setLocation] = useLocation();

  const [open, setOpen] = useState(false);
  /** `href` of a `collapsible` nav group that is expanded in the sidebar. */
  const [openCollapsibleHref, setOpenCollapsibleHref] = useState<string | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const collapsible = ADMIN_NAV_LINKS.find((l) => l.collapsible && l.children?.length);
    if (!collapsible?.children) return;
    const onChild = collapsible.children.some(
      (c) => location === c.href || location.startsWith(`${c.href}/`),
    );
    if (onChild) {
      setOpenCollapsibleHref(collapsible.href);
    } else if (!location.startsWith(collapsible.href)) {
      setOpenCollapsibleHref(null);
    }
  }, [location]);

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
    "/admin/booked-calls": PhoneCall,
    "/admin/learn": School,
    "/admin/learn/groups": Users,
    "/admin/instructors": Car,
    "/admin/users": GraduationCap,
    "/admin/users/analytics": GraduationCap,
    "/admin/finance": Landmark,
    "/admin/blogs": Newspaper,
    "/admin/accounts": UserCog,
    "/admin/marketing-content": Sparkles,
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
    if (link.allowedAccountTypes?.length && user && !link.allowedAccountTypes.includes(user.accountType)) {
      return null;
    }
    const Icon = iconByPath[link.href as keyof typeof iconByPath];
    const hasChildren = Boolean(link.children?.length);

    if (link.collapsible && link.children?.length) {
      const isOpen = openCollapsibleHref === link.href;
      const onParent = location === link.href;
      const underParent = link.children.some(
        (c) => location === c.href || location.startsWith(`${c.href}/`),
      );
      const parentStrong = onParent;
      const parentSoft = underParent && !onParent;

      return (
        <div key={link.href} className="space-y-0.5">
          <button
            type="button"
            aria-expanded={isOpen}
            onClick={() => {
              setOpenCollapsibleHref((prev) => (prev === link.href ? null : link.href));
              setOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              parentStrong
                ? "bg-primary text-primary-foreground"
                : parentSoft
                  ? "bg-white/10 text-hero-foreground"
                  : "text-hero-foreground/80 hover:bg-white/10 hover:text-hero-foreground",
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">{t(link.translationKey)}</span>
            <ChevronDown
              className={cn("w-4 h-4 shrink-0 transition-transform opacity-80", isOpen && "rotate-180")}
              aria-hidden
            />
          </button>
          {isOpen ? (
            <div className="ml-3 pl-3 border-l border-white/15 space-y-0.5">
              {link.children.map((child) => {
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
          ) : null}
        </div>
      );
    }

    if (!hasChildren) {
      const active =
        location === link.href ||
        (link.href === "/admin/users" && location.startsWith("/admin/users/"));
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

    const onParent = location === link.href;
    const underParent = location.startsWith(`${link.href}/`);
    const parentSoft = underParent && !onParent;
    const parentStrong = onParent;

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
    signOut();
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
              <span className="text-xs text-primary font-medium">
                {user ? t(panelRoleLabelKey(user.accountType)) : t("adminSidebarRoleBadge")}
              </span>
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
          {user ? initialsFromName(user.name) : "?"}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium text-foreground truncate">{user?.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</p>
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
        <header className="bg-card border-b border-border px-3 sm:px-6 min-h-14 h-14 sm:h-16 sm:min-h-16 flex items-center justify-between gap-2 shrink-0 z-20">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild className="lg:hidden shrink-0">
                <Button variant="ghost" size="icon-lg" aria-label={t("openMenu")}>
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[min(20rem,86vw)] p-0 bg-hero">
                <div className="h-full pt-12 flex flex-col min-h-0">
                  <Sidebar />
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="font-semibold text-foreground text-sm sm:text-base truncate min-w-0">
              {location === "/admin/profile"
                ? t("adminProfileTitle")
                : location === "/admin/learn/practical"
                  ? t("adminLearnPracticalTitle")
                  : location === "/admin/learn/theory"
                    ? t("adminLearnTheoryTitle")
                    : location === "/admin/learn/exam-questions"
                      ? t("adminExamQuestionsTitle")
                      : location === "/admin/learn/groups"
                        ? t("adminSidebarGroups")
                        : location === "/admin/learn/packages"
                          ? t("packages")
                          : location === "/admin/users/analytics"
                            ? t("adminStudentsAnalytics")
                            : adminNavLabels.find((n) => n.href === location)?.label || t("adminDashboard")}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main
          ref={mainRef}
          className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
