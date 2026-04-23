import type { AccountType } from "src/modules/accounts";
import type { AppRoute } from "src/shared/types/router.types";
import {
  DashboardPage,
  DashboardLearnPage,
  DashboardExamTestsPage,
  DashboardExamQuizPage,
  DashboardThematicTestsPage,
  DashboardBookingsPage,
  DashboardPaymentsPage,
  DashboardProfilePage,
  DashboardServicesPage,
  DashboardLessonsPage,
  DashboardProgressPage,
} from "src/pages/dashboard-pages";

const STUDENT: readonly AccountType[] = ["student"];

export const dashboardRoutes: readonly AppRoute[] = [
  { path: "/dashboard", component: DashboardPage, allowedAccountTypes: STUDENT },
  { path: "/dashboard/learn", component: DashboardLearnPage, allowedAccountTypes: STUDENT },
  { path: "/dashboard/services", component: DashboardServicesPage, allowedAccountTypes: STUDENT },
  { path: "/dashboard/lessons", component: DashboardLessonsPage, allowedAccountTypes: STUDENT },
  { path: "/dashboard/progress", component: DashboardProgressPage, allowedAccountTypes: STUDENT },
  { path: "/dashboard/learn/exam-tests/quiz/:mode", component: DashboardExamQuizPage, allowedAccountTypes: STUDENT },
  { path: "/dashboard/learn/exam-tests", component: DashboardExamTestsPage, allowedAccountTypes: STUDENT },
  { path: "/dashboard/learn/thematic-tests", component: DashboardThematicTestsPage, allowedAccountTypes: STUDENT },
  { path: "/dashboard/exam-tests/quiz/:mode", component: DashboardExamQuizPage, allowedAccountTypes: STUDENT },
  { path: "/dashboard/exam-tests", component: DashboardExamTestsPage, allowedAccountTypes: STUDENT },
  { path: "/dashboard/bookings", component: DashboardBookingsPage, allowedAccountTypes: STUDENT, nest: true },
  { path: "/dashboard/payments", component: DashboardPaymentsPage, allowedAccountTypes: STUDENT },
  { path: "/dashboard/profile", component: DashboardProfilePage, allowedAccountTypes: STUDENT },
];
