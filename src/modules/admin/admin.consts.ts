import type { AdminNavigationLink } from "./admin.types";

export const ADMIN_NAV_LINKS: readonly AdminNavigationLink[] = [
  { href: "/admin/dashboard", translationKey: "adminDashboard" },
  { href: "/admin/users", translationKey: "users" },
  { href: "/admin/instructors", translationKey: "instructors" },
  { href: "/admin/bookings", translationKey: "bookings" },
  { href: "/admin/packages", translationKey: "packages" },
  { href: "/admin/cohorts", translationKey: "cohorts" },
];
