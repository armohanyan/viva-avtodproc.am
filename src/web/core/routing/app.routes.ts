import type { AppRoute } from "@/shared/types/router.types";
import { combineRoutes } from "@/shared/helpers/route.helper";
import { publicRoutes } from "@/modules/public/public.routes";
import { authRoutes } from "@/modules/auth/auth.routes";
import { dashboardRoutes } from "@/modules/dashboard/dashboard.routes";
import { adminRoutes } from "@/modules/admin/admin.routes";

export const appRoutes: readonly AppRoute[] = combineRoutes(
  publicRoutes,
  authRoutes,
  dashboardRoutes,
  adminRoutes,
);
