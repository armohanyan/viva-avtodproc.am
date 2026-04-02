import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useLang } from "../lib/i18n";
import { useToast } from "../lib/toast";
import {
  LayoutDashboard, Calendar, ShoppingBag, CreditCard, User, ClipboardCheck,
  Bell, LogOut, Menu
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Button } from "./ui/button";
import ThemeToggle from "./ThemeToggle";
import { DASHBOARD_NAV_LINKS } from "src/modules/dashboard/dashboard.consts";

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
    "/dashboard/exam-tests": ClipboardCheck,
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

  const isNavActive = (href: string) => {
    if (href === "/dashboard/exam-tests") return location.startsWith("/dashboard/exam-tests");
    return location === href;
  };

  const handleLogout = () => {
    showToast(t("logoutSuccess"), "info");
    setTimeout(() => setLocation("/"), 800);
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-card">
      <div className="p-5 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <img src="/logo.jpg" alt={t("brandName")} className="w-5 h-5 object-contain" />
          </div>
          <span className="font-bold text-foreground">{t("brandName")}</span>
        </Link>
      </div>
      <div className="px-3 py-4 flex-1 overflow-y-auto">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-3">
          Navigation
        </p>
        <nav className="space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isNavActive(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="p-4 border-t border-border bg-background/60">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-primary font-semibold text-sm shrink-0">
            A
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">Armen P.</p>
            <p className="text-xs text-muted-foreground truncate">armen@example.com</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent w-full"
        >
          <LogOut className="w-4 h-4" />
          {t("logout")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      <div className="hidden lg:flex w-64 bg-card border-r border-border flex-col shrink-0">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-card border-b border-border px-4 sm:px-6 h-16 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon-lg"><Menu className="h-6 w-6" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[86vw] max-w-[20rem] p-0">
                <div className="h-full pt-12">
                  <Sidebar />
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="font-semibold text-foreground hidden sm:block">
              {location.startsWith("/dashboard/exam-tests")
                ? t("examTests")
                : nav.find((n) => n.href === location)?.label || t("dashboard")}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              className="relative w-9 h-9 rounded-full hover:bg-accent flex items-center justify-center"
              onClick={() => showToast(t("notifications") + " coming soon.", "info")}
            >
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-primary font-semibold text-sm">
              A
            </div>
          </div>
        </header>
        <main ref={mainRef} className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
