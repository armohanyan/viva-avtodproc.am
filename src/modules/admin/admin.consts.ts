import type { AdminNavigationLink } from "./admin.types";

export const ADMIN_NAV_LINKS: readonly AdminNavigationLink[] = [
  { href: "/admin/dashboard", translationKey: "adminDashboard" },
  { href: "/admin/branches", translationKey: "adminSidebarBranches" },
  { href: "/admin/cars", translationKey: "adminSidebarCars" },
  { href: "/admin/bookings", translationKey: "bookings" },
  { href: "/admin/learn", translationKey: "adminSidebarLearn" },
  { href: "/admin/cohorts", translationKey: "adminSidebarGroups" },
  { href: "/admin/instructors", translationKey: "adminSidebarInstructors" },
  { href: "/admin/users", translationKey: "adminSidebarStudents" },
  { href: "/admin/packages", translationKey: "packages" },
  { href: "/admin/finance", translationKey: "adminFinance" },
  { href: "/admin/blogs", translationKey: "blogsAdmin" },
  { href: "/admin/accounts", translationKey: "adminAccounts" },
];
