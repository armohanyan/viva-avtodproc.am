import type { AppRoute } from "src/shared/types/router.types";
import {
  DashboardPage,
  DashboardExamTestsPage,
  DashboardExamQuizPage,
  DashboardBookingsPage,
  DashboardPurchasesPage,
  DashboardPaymentsPage,
  DashboardProfilePage,
} from "src/pages/dashboard-pages";

export const dashboardRoutes: readonly AppRoute[] = [
  { path: "/dashboard", component: DashboardPage },
  { path: "/dashboard/exam-tests/quiz/:mode", component: DashboardExamQuizPage },
  { path: "/dashboard/exam-tests", component: DashboardExamTestsPage },
  { path: "/dashboard/bookings", component: DashboardBookingsPage },
  { path: "/dashboard/purchases", component: DashboardPurchasesPage },
  { path: "/dashboard/payments", component: DashboardPaymentsPage },
  { path: "/dashboard/profile", component: DashboardProfilePage },
];
