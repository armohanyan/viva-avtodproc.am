import type { AppRoute } from "@/shared/types/router.types";
import { LoginPage, RegisterPage, ForgotPasswordPage } from "@/pages/auth";

export const authRoutes: readonly AppRoute[] = [
  { path: "/login", component: LoginPage },
  { path: "/register", component: RegisterPage },
  { path: "/forgot-password", component: ForgotPasswordPage },
];
