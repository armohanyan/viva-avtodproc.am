import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useLang } from "../lib/i18n";
import { useToast } from "../lib/toast";
import {
  LayoutDashboard, Calendar, ShoppingBag, CreditCard, User, BookOpen,
  LogOut, Menu, Settings
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Button } from "./ui/button";
import ThemeToggle from "./ThemeToggle";
import LangToggle from "./LangToggle";
import { DASHBOARD_NAV_LINKS } from "src/modules/dashboard/dashboard.consts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface Props { children: ReactNode; }

export default function DashboardLayout({ children }: Props) {
  const { t } = useLang();
  const { showToast } = useToast();
  const [location, setLocation] = useLocation();
  
  const [open, setOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Dashboard pages render into a scrollable <main> container.
    // Reset it on route changes so the user doesn't land at the previous page's bottom.
    mainRef.current?.scrollTo(0, 0);
  }, [location]);

  const iconByPath = {
    "/dashboard": LayoutDashboard,
    "/dashboard/learn": BookOpen,
    "/dashboard/bookings": Calendar,
    "/dashboard/purchases": ShoppingBag,
    "/dashboard/payments": CreditCard,
    "/dashboard/profile": User,
  } as const;

  const nav = DASHBOARD_NAV_LINKS.map((link) => ({
    href: link.href,
    icon: iconByPath[link.href as keyof typeof iconByPath],
    label: t(link.translationKey),
  }));

  const headerTitle = useMemo(() => {
    if (location.startsWith("/dashboard/learn/exam-tests") || location.startsWith("/dashboard/exam-tests")) {
      return t("dashboardLearnExamTests");
    }
    if (location.startsWith("/dashboard/learn/thematic-tests")) {
      return t("dashboardLearnThematicTests");
    }
    if (location.startsWith("/dashboard/learn")) {
      return t("learn");
    }
    if (location.startsWith("/dashboard/bookings/package")) {
      return t("bookingsSubnavPackage");
    }
    if (location.startsWith("/dashboard/bookings/practical")) {
      return t("bookingsSubnavPractical");
    }
    const hit = DASHBOARD_NAV_LINKS.find((l) => l.href === location);
    return hit ? t(hit.translationKey) : t("dashboard");
  }, [location, t]);

  const isNavActive = (href: string) => {
    if (href === "/dashboard/learn") {
      return location.startsWith("/dashboard/learn") || location.startsWith("/dashboard/exam-tests");
    }
    if (href === "/dashboard/bookings") {
      return location.startsWith("/dashboard/bookings");
    }
    return location === href;
  };

  const handleLogout = () => {
    showToast(t("logoutSuccess"), "info");
    setTimeout(() => setLocation("/"), 800);
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full min-h-0 bg-card">
      <div className="p-5 border-b border-border shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <img src="/logo.jpg" alt={t("brandName")} className="w-5 h-5 object-contain" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-foreground block truncate">{t("brandName")}</span>
            <p className="text-xs text-primary font-medium truncate">{t("roleStudent")}</p>
          </div>
        </Link>
      </div>
      <nav className="px-3 py-4 flex-1 min-h-0 overflow-y-auto space-y-1">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isNavActive(item.href)
                ? "bg-primary text-primary-foreground"
                : "text-foreground/80 hover:bg-primary/10 hover:text-foreground"
            }`}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );

  const UserMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-primary font-semibold text-sm shrink-0 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={t("profile")}
        >
          A
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium text-foreground truncate">Armen P.</p>
          <p className="text-xs text-muted-foreground truncate">armen@example.com</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/profile" className="cursor-pointer" onClick={() => setOpen(false)}>
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
      <aside className="hidden lg:flex w-64 shrink-0 fixed inset-y-0 left-0 z-30 border-r border-border bg-card flex-col">
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
              <SheetContent side="left" className="w-[min(20rem,86vw)] p-0">
                <div className="h-full pt-12 flex flex-col min-h-0">
                  <Sidebar />
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="font-semibold text-foreground text-sm sm:text-base truncate min-w-0">{headerTitle}</h1>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <LangToggle />
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
