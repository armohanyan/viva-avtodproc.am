import type { AppRoute } from "src/shared/types/router.types";
import {
  AdminDashboardPage,
  AdminUsersPage,
  AdminInstructorsPage,
  AdminBookingsPage,
  AdminPackagesPage,
  AdminCohortsPage,
} from "src/pages/admin";

export const adminRoutes: readonly AppRoute[] = [
  { path: "/admin/dashboard", component: AdminDashboardPage },
  { path: "/admin/users", component: AdminUsersPage },
  { path: "/admin/instructors", component: AdminInstructorsPage },
  { path: "/admin/bookings", component: AdminBookingsPage },
  { path: "/admin/packages", component: AdminPackagesPage },
  { path: "/admin/cohorts", component: AdminCohortsPage },
];
