import type { AccountType } from "src/modules/accounts";
import type { AppRoute } from "src/types/router.types";
import {
  InstructorDashboardPage,
  InstructorStudentsPage,
  InstructorCarsPage,
  InstructorProfilePage,
  InstructorNotificationsPage,
  InstructorClassSchedulePage,
} from "src/pages/instructor";

const INSTRUCTOR: readonly AccountType[] = ["instructor"];

export const instructorRoutes: readonly AppRoute[] = [
  { path: "/instructor/dashboard", component: InstructorDashboardPage, allowedAccountTypes: INSTRUCTOR },
  { path: "/instructor/students", component: InstructorStudentsPage, allowedAccountTypes: INSTRUCTOR },
  { path: "/instructor/class-schedule", component: InstructorClassSchedulePage, allowedAccountTypes: INSTRUCTOR },
  { path: "/instructor/cars", component: InstructorCarsPage, allowedAccountTypes: INSTRUCTOR },
  { path: "/instructor/profile", component: InstructorProfilePage, allowedAccountTypes: INSTRUCTOR },
  { path: "/instructor/notifications", component: InstructorNotificationsPage, allowedAccountTypes: INSTRUCTOR },
];
