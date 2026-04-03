import type { AppRoute } from "src/shared/types/router.types";
import {
  InstructorDashboardPage,
  InstructorStudentsPage,
  InstructorBookingsPage,
  InstructorCarsPage,
  InstructorProfilePage,
} from "src/pages/instructor";

export const instructorRoutes: readonly AppRoute[] = [
  { path: "/instructor/dashboard", component: InstructorDashboardPage },
  { path: "/instructor/students", component: InstructorStudentsPage },
  { path: "/instructor/bookings", component: InstructorBookingsPage },
  { path: "/instructor/cars", component: InstructorCarsPage },
  { path: "/instructor/profile", component: InstructorProfilePage },
];
