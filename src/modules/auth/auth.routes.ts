import type { AppRoute } from "src/shared/types/router.types";
import { LoginPage, RegisterPage, ForgotPasswordPage } from "src/pages/auth";

export const authRoutes: readonly AppRoute[] = [
  { path: "/login", component: LoginPage },
  { path: "/register", component: RegisterPage },
  { path: "/forgot-password", component: ForgotPasswordPage },
];
