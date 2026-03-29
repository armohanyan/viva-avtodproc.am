import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useLang } from "../lib/i18n";
import { useToast } from "../lib/toast";
import {
  LayoutDashboard, Users, Car, Calendar, Package, BookOpen,
  LogOut, Menu, Bell, Shield
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Button } from "./ui/button";
import LangToggle from "./LangToggle";
import { ADMIN_NAV_LINKS } from "src/modules/admin/admin.consts";

interface Props { children: ReactNode; }

export default function AdminLayout({ children }: Props) {
  const { t } = useLang();
  const { showToast } = useToast();
  const [location, setLocation] = useLocation();
  
  const [open, setOpen] = useState(false);

  const iconByPath = {
    "/admin/dashboard": LayoutDashboard,
    "/admin/users": Users,
    "/admin/instructors": Car,
    "/admin/bookings": Calendar,
    "/admin/packages": Package,
    "/admin/cohorts": BookOpen,
  } as const;

  const nav = ADMIN_NAV_LINKS.map((link) => {
    return {
      href: link.href,
      icon: iconByPath[link.href],
      label: t(link.translationKey),
    };
  });

  const handleLogout = () => {
    showToast(t("logoutSuccess"), "info");
    setTimeout(() => setLocation("/"), 800);
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="p-6 border-b border-slate-800">
        <Link href="/public" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Car className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-sm">Viva Drive</span>
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-blue-400" />
              <span className="text-xs text-blue-400 font-medium">Admin</span>
            </div>
          </div>
        </Link>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        <nav className="space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location === item.href
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">SA</div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">Super Admin</p>
            <p className="text-xs text-slate-400 truncate">admin@vivadrive.am</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white w-full"
        >
          <LogOut className="w-4 h-4" />
          {t("logout")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-100">
      <div className="hidden lg:flex w-64 shrink-0"><Sidebar /></div>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="sm"><Menu className="w-5 h-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-slate-900"><Sidebar /></SheetContent>
            </Sheet>
            <h1 className="font-semibold text-slate-900 text-sm">
              {nav.find(n => n.href === location)?.label || "Admin"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <LangToggle />
            <button className="relative w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center">
              <Bell className="w-4 h-4 text-slate-600" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
