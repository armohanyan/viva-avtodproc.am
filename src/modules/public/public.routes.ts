import type { AppRoute } from "src/shared/types/router.types";
import {
  HomePage,
  AboutPage,
  ServicesPage,
  PackagesPage,
  InstructorsPage,
  ContactPage,
  ExamTestsPage,
  ExamQuizPage,
} from "src/pages/public";

export const publicRoutes: readonly AppRoute[] = [
  { path: "/", component: HomePage },
  { path: "/about", component: AboutPage },
  { path: "/services", component: ServicesPage },
  { path: "/packages", component: PackagesPage },
  { path: "/instructors", component: InstructorsPage },
  { path: "/contact", component: ContactPage },
  { path: "/thematic-questions", component: ExamTestsPage },
  { path: "/thematic-questions/quiz/:mode", component: ExamQuizPage },
  { path: "/exam-tests", component: ExamTestsPage },
  { path: "/exam-tests/quiz/:mode", component: ExamQuizPage },
];
