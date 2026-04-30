import type { AdminNavigationLink } from "./admin.types";

/** Sidebar order: overview → day-to-day ops → people & programs → catalog → locations → money → content → access control */
export const ADMIN_NAV_LINKS: readonly AdminNavigationLink[] = [
  { href: "/admin/dashboard", translationKey: "adminDashboard" },
  { href: "/admin/notifications", translationKey: "notifications" },
  { href: "/admin/bookings", translationKey: "bookings" },
  {
    href: "/admin/students",
    translationKey: "adminSidebarStudents",
    collapsible: true,
    children: [{ href: "/admin/students/analytics", translationKey: "adminStudentsAnalytics" }],
  },
  {
    href: "/admin/learn",
    translationKey: "adminSidebarLearn",
    collapsible: true,
    children: [
      { href: "/admin/learn/groups", translationKey: "adminSidebarGroups" },
      { href: "/admin/learn/packages", translationKey: "packages" },
      { href: "/admin/learn/exam-questions", translationKey: "adminLearnNavQuestionnaire" },
    ],
  },
  {
    href: "/admin/finance",
    translationKey: "adminFinance",
    collapsible: true,
    children: [
      { href: "/admin/finance", translationKey: "adminFinanceOverviewNav" },
      { href: "/admin/finance/income", translationKey: "adminFinanceIncomeNav" },
      { href: "/admin/finance/outcomes", translationKey: "adminFinanceOutcomesNav" },
    ],
  },
  { href: "/admin/contact-requests", translationKey: "adminContactRequests" },
  { href: "/admin/booked-calls", translationKey: "adminBookedCalls" },
  { href: "/admin/instructors", translationKey: "adminSidebarInstructors" },
  { href: "/admin/cars", translationKey: "adminSidebarCars" },
  { href: "/admin/branches", translationKey: "adminSidebarBranches" },
  {
    href: "/admin/marketing-content",
    translationKey: "adminMarketingContent",
    allowedAccountTypes: ["super_admin"],
  },
  { href: "/admin/blogs", translationKey: "blogsAdmin" },
  { href: "/admin/accounts", translationKey: "adminAccounts" },
];
