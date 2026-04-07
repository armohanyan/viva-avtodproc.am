import type { DashboardNavigationLink } from "./dashboard.types";

export const DASHBOARD_NAV_LINKS: readonly DashboardNavigationLink[] = [
  { href: "/dashboard", translationKey: "dashboard" },
  { href: "/dashboard/learn", translationKey: "learn" },
  { href: "/dashboard/bookings", translationKey: "bookings" },
  { href: "/dashboard/purchases", translationKey: "purchases" },
  { href: "/dashboard/payments", translationKey: "payments" },
  { href: "/dashboard/profile", translationKey: "profile" },
];
