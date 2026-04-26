import type { AccountType } from "src/modules/accounts";
import type { AppRoute } from "src/shared/types/router.types";
import {
  InstructorDashboardPage,
  InstructorStudentsPage,
  InstructorMyLessonsPage,
  InstructorCarsPage,
  InstructorProfilePage,
} from "src/pages/instructor";

const INSTRUCTOR: readonly AccountType[] = ["instructor"];

export const instructorRoutes: readonly AppRoute[] = [
  { path: "/instructor/dashboard", component: InstructorDashboardPage, allowedAccountTypes: INSTRUCTOR },
  { path: "/instructor/students", component: InstructorStudentsPage, allowedAccountTypes: INSTRUCTOR },
  { path: "/instructor/my-lessons", component: InstructorMyLessonsPage, allowedAccountTypes: INSTRUCTOR },
  { path: "/instructor/cars", component: InstructorCarsPage, allowedAccountTypes: INSTRUCTOR },
  { path: "/instructor/profile", component: InstructorProfilePage, allowedAccountTypes: INSTRUCTOR },
];
