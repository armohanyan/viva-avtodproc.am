import type { AccountType } from "src/modules/accounts";
import type { AppRoute } from "src/shared/types/router.types";
import {
  DashboardPage,
  DashboardLearnPage,
  DashboardExamTestsPage,
  DashboardExamQuizPage,
  DashboardThematicTestsPage,
  DashboardBookingsPage,
  DashboardBookingsPackagePage,
  DashboardBookingsPracticalPage,
  DashboardPurchasesPage,
  DashboardPaymentsPage,
  DashboardProfilePage,
} from "src/pages/dashboard-pages";

const STUDENT: readonly AccountType[] = ["student"];

export const dashboardRoutes: readonly AppRoute[] = [
  { path: "/dashboard", component: DashboardPage, allowedAccountTypes: STUDENT },
  { path: "/dashboard/learn", component: DashboardLearnPage, allowedAccountTypes: STUDENT },
  { path: "/dashboard/learn/exam-tests/quiz/:mode", component: DashboardExamQuizPage, allowedAccountTypes: STUDENT },
  { path: "/dashboard/learn/exam-tests", component: DashboardExamTestsPage, allowedAccountTypes: STUDENT },
  { path: "/dashboard/learn/thematic-tests", component: DashboardThematicTestsPage, allowedAccountTypes: STUDENT },
  { path: "/dashboard/exam-tests/quiz/:mode", component: DashboardExamQuizPage, allowedAccountTypes: STUDENT },
  { path: "/dashboard/exam-tests", component: DashboardExamTestsPage, allowedAccountTypes: STUDENT },
  { path: "/dashboard/bookings/package", component: DashboardBookingsPackagePage, allowedAccountTypes: STUDENT },
  { path: "/dashboard/bookings/practical", component: DashboardBookingsPracticalPage, allowedAccountTypes: STUDENT },
  { path: "/dashboard/bookings", component: DashboardBookingsPage, allowedAccountTypes: STUDENT },
  { path: "/dashboard/purchases", component: DashboardPurchasesPage, allowedAccountTypes: STUDENT },
  { path: "/dashboard/payments", component: DashboardPaymentsPage, allowedAccountTypes: STUDENT },
  { path: "/dashboard/profile", component: DashboardProfilePage, allowedAccountTypes: STUDENT },
];
