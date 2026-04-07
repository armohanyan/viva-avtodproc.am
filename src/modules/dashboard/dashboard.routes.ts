import type { AppRoute } from "src/shared/types/router.types";
import {
  DashboardPage,
  DashboardLearnPage,
  DashboardExamTestsPage,
  DashboardExamQuizPage,
  DashboardThematicTestsPage,
  DashboardBookingsPage,
  DashboardPurchasesPage,
  DashboardPaymentsPage,
  DashboardProfilePage,
} from "src/pages/dashboard-pages";

export const dashboardRoutes: readonly AppRoute[] = [
  { path: "/dashboard", component: DashboardPage },
  { path: "/dashboard/learn", component: DashboardLearnPage },
  { path: "/dashboard/learn/exam-tests/quiz/:mode", component: DashboardExamQuizPage },
  { path: "/dashboard/learn/exam-tests", component: DashboardExamTestsPage },
  { path: "/dashboard/learn/thematic-tests", component: DashboardThematicTestsPage },
  { path: "/dashboard/exam-tests/quiz/:mode", component: DashboardExamQuizPage },
  { path: "/dashboard/exam-tests", component: DashboardExamTestsPage },
  { path: "/dashboard/bookings", component: DashboardBookingsPage },
  { path: "/dashboard/purchases", component: DashboardPurchasesPage },
  { path: "/dashboard/payments", component: DashboardPaymentsPage },
  { path: "/dashboard/profile", component: DashboardProfilePage },
];
