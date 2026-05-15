import type { DashboardNavigationLink } from "./dashboard.types";

export const DASHBOARD_NAV_LINKS: readonly DashboardNavigationLink[] = [
  { href: "/dashboard", translationKey: "dashboard" },
  { href: "/dashboard/progress", translationKey: "dashboardNavProgress" },
  { href: "/dashboard/lessons", translationKey: "dashboardNavLessons" },
  { href: "/dashboard/learn/thematic-tests", translationKey: "learn" },
  { href: "/dashboard/services", translationKey: "dashboardNavServices" },
  {
    href: "/dashboard/bookings",
    translationKey: "bookings",
    children: [
      { href: "/dashboard/bookings/practical", translationKey: "bookingsSubnavPractical" },
      { href: "/dashboard/bookings/theory-personal", translationKey: "bookingsSubnavTheoryPersonal" },
      { href: "/dashboard/bookings/theory-group", translationKey: "bookingsSubnavTheoryGroup" },
      { href: "/dashboard/bookings/package", translationKey: "bookingsSubnavPackage" },
    ],
  },
  { href: "/dashboard/payments", translationKey: "payments" },
  { href: "/dashboard/profile", translationKey: "profile" },
];
