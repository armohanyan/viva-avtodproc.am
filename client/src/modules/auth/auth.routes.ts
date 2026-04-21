import type { AppRoute } from "src/shared/types/router.types";
import {
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  AuthCallbackPage,
  VerifyAdmin2faPage,
  SetupPasswordPage,
  ResetPasswordPage,
} from "src/pages/auth";

export const authRoutes: readonly AppRoute[] = [
  { path: "/login", component: LoginPage },
  { path: "/register", component: RegisterPage },
  { path: "/forgot-password", component: ForgotPasswordPage },
  { path: "/auth/verify-2fa", component: VerifyAdmin2faPage },
  { path: "/setup-password", component: SetupPasswordPage },
  { path: "/reset-password", component: ResetPasswordPage },
  { path: "/auth/callback", component: AuthCallbackPage },
];
