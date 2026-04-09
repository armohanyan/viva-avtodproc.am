import type { AdminNavigationLink } from "./admin.types";

/** Sidebar order: overview → day-to-day ops → people & programs → catalog → locations → money → content → access control */
export const ADMIN_NAV_LINKS: readonly AdminNavigationLink[] = [
  { href: "/admin/dashboard", translationKey: "adminDashboard" },
  { href: "/admin/bookings", translationKey: "bookings" },
  {
    href: "/admin/users",
    translationKey: "adminSidebarStudents",
    children: [
      { href: "/admin/users/analytics", translationKey: "adminStudentsAnalytics" },
    ],
  },
  {
    href: "/admin/learn",
    translationKey: "adminSidebarLearn",
    children: [
      { href: "/admin/learn/groups", translationKey: "adminSidebarGroups" },
      { href: "/admin/learn/packages", translationKey: "packages" },
      { href: "/admin/learn/exam-questions", translationKey: "adminSidebarExamQuestions" },
    ],
  },
  { href: "/admin/instructors", translationKey: "adminSidebarInstructors" },
  { href: "/admin/cars", translationKey: "adminSidebarCars" },
  { href: "/admin/branches", translationKey: "adminSidebarBranches" },
  { href: "/admin/finance", translationKey: "adminFinance" },
  { href: "/admin/blogs", translationKey: "blogsAdmin" },
  { href: "/admin/accounts", translationKey: "adminAccounts" },
];
