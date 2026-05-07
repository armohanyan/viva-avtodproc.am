import type { AccountType } from "src/modules/accounts";
import type { AdminNavigationLink } from "./admin.types";

/** Routes and sidebar entries visible only to super admins (regular admins use day-to-day ops only). */
export const SUPER_ADMIN_ONLY_ACCOUNT_TYPES: readonly AccountType[] = ["super_admin"];

/** Sidebar: show restricted items until session is known; hide once `user` is present and not allowed. */
export function adminNavAllowedForUser(
  user: { accountType: AccountType } | null | undefined,
  allowedAccountTypes: readonly AccountType[] | undefined,
): boolean {
  if (!allowedAccountTypes?.length) return true;
  if (!user) return true;
  return allowedAccountTypes.includes(user.accountType);
}

/** Sidebar order: overview → day-to-day ops → people & programs → catalog → locations → money → content → access control */
export const ADMIN_NAV_LINKS: readonly AdminNavigationLink[] = [
  { href: "/admin/dashboard", translationKey: "adminDashboard" },
  { href: "/admin/notifications", translationKey: "notifications" },
  { href: "/admin/bookings", translationKey: "bookings" },
  { href: "/admin/students", translationKey: "adminSidebarStudents" },
  {
    href: "/admin/learn",
    translationKey: "adminSidebarLearn",
    collapsible: true,
    children: [
      {
        href: "/admin/learn/groups",
        translationKey: "adminSidebarGroups",
        allowedAccountTypes: SUPER_ADMIN_ONLY_ACCOUNT_TYPES,
      },
      { href: "/admin/learn/packages", translationKey: "packages" },
      { href: "/admin/learn/exam-questions", translationKey: "adminLearnNavQuestionnaire" },
    ],
  },
  {
    href: "/admin/finance",
    translationKey: "adminFinance",
    allowedAccountTypes: SUPER_ADMIN_ONLY_ACCOUNT_TYPES,
    collapsible: true,
    children: [
      { href: "/admin/finance", translationKey: "adminFinanceOverviewNav" },
      { href: "/admin/finance/transactions", translationKey: "adminFinanceTransactionsNav" },
      { href: "/admin/finance/income", translationKey: "adminFinanceIncomeNav" },
      { href: "/admin/finance/outcomes", translationKey: "adminFinanceOutcomesNav" },
    ],
  },
  { href: "/admin/contact-requests", translationKey: "adminContactRequests" },
  { href: "/admin/booked-calls", translationKey: "adminBookedCalls" },
  { href: "/admin/instructors", translationKey: "adminSidebarInstructors" },
  { href: "/admin/cars", translationKey: "adminSidebarCars", allowedAccountTypes: SUPER_ADMIN_ONLY_ACCOUNT_TYPES },
  { href: "/admin/branches", translationKey: "adminSidebarBranches" },
  {
    href: "/admin/marketing-content",
    translationKey: "adminMarketingContent",
    allowedAccountTypes: SUPER_ADMIN_ONLY_ACCOUNT_TYPES,
  },
  { href: "/admin/blogs", translationKey: "blogsAdmin", allowedAccountTypes: SUPER_ADMIN_ONLY_ACCOUNT_TYPES },
  { href: "/admin/accounts", translationKey: "adminAccounts", allowedAccountTypes: SUPER_ADMIN_ONLY_ACCOUNT_TYPES },
];
