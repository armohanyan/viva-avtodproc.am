import type { AppRoute } from "src/shared/types/router.types";
import {
  HomePage,
  AboutPage,
  ServicesPage,
  PackagesPage,
  InstructorsPage,
  ContactPage,
  ExamTestsPage,
} from "src/pages/public";

export const publicRoutes: readonly AppRoute[] = [
  { path: "/", component: HomePage },
  { path: "/about", component: AboutPage },
  { path: "/services", component: ServicesPage },
  { path: "/packages", component: PackagesPage },
  { path: "/instructors", component: InstructorsPage },
  { path: "/contact", component: ContactPage },
  { path: "/exam-tests", component: ExamTestsPage },
];
