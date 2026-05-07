import type { AppRoute } from "src/types/router.types";
import {
  HomePage,
  AboutPage,
  ServicesPage,
  PackagesPage,
  InstructorsPage,
  ContactPage,
  ExamTestsPage,
  ExamQuizPage,
  QuestionDetailPage,
  BlogsPage,
  BlogPostPage,
} from "src/views/public";

export const publicRoutes: readonly AppRoute[] = [
  { path: "/", component: HomePage },
  { path: "/about", component: AboutPage },
  { path: "/services", component: ServicesPage },
  { path: "/packages", component: PackagesPage },
  { path: "/instructors", component: InstructorsPage },
  { path: "/blogs", component: BlogsPage },
  { path: "/blogs/:slug", component: BlogPostPage },
  { path: "/contact", component: ContactPage },
  { path: "/thematic-questions", component: ExamTestsPage },
  { path: "/thematic-questions/question/:id", component: QuestionDetailPage },
  { path: "/thematic-questions/quiz/:mode", component: ExamQuizPage },
  { path: "/exam-tests", component: ExamTestsPage },
  { path: "/exam-tests/question/:id", component: QuestionDetailPage },
  { path: "/exam-tests/quiz/:mode", component: ExamQuizPage },
];
