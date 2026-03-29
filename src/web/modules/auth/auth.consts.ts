import type { AuthRouteMeta } from "./auth.types";

export const AUTH_ROUTE_META: readonly AuthRouteMeta[] = [
  { path: "/login", translationKey: "login" },
  { path: "/register", translationKey: "register" },
  { path: "/forgot-password", translationKey: "forgotPassword" },
];
