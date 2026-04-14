import type { AdminNavigationLink } from "./admin.types";

/** Sidebar order: overview → day-to-day ops → people & programs → catalog → locations → money → content → access control */
export const ADMIN_NAV_LINKS: readonly AdminNavigationLink[] = [
  { href: "/admin/dashboard", translationKey: "adminDashboard" },
  { href: "/admin/bookings", translationKey: "bookings" },
  { href: "/admin/booked-calls", translationKey: "adminBookedCalls" },
  { href: "/admin/users", translationKey: "adminSidebarStudents" },
  {
    href: "/admin/learn",
    translationKey: "adminSidebarLearn",
    collapsible: true,
    children: [
      { href: "/admin/learn/practical", translationKey: "adminLearnNavRegisterPractical" },
      { href: "/admin/learn/theory", translationKey: "adminLearnNavRegisterTheory" },
      { href: "/admin/learn/packages", translationKey: "packages" },
      { href: "/admin/learn/exam-questions", translationKey: "adminLearnNavQuestionnaire" },
    ],
  },
  { href: "/admin/learn/groups", translationKey: "adminSidebarGroups" },
  { href: "/admin/instructors", translationKey: "adminSidebarInstructors" },
  { href: "/admin/cars", translationKey: "adminSidebarCars" },
  { href: "/admin/branches", translationKey: "adminSidebarBranches" },
  { href: "/admin/finance", translationKey: "adminFinance" },
  { href: "/admin/blogs", translationKey: "blogsAdmin" },
  {
    href: "/admin/marketing-content",
    translationKey: "adminMarketingContent",
    allowedAccountTypes: ["super_admin"],
  },
  { href: "/admin/accounts", translationKey: "adminAccounts" },
];
