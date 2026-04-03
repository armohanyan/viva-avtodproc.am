import type { AppRoute } from "src/shared/types/router.types";
import { combineRoutes } from "src/shared/helpers/route.helper";
import { publicRoutes } from "src/modules/public/public.routes";
import { authRoutes } from "src/modules/auth/auth.routes";
import { dashboardRoutes } from "src/modules/dashboard/dashboard.routes";
import { adminRoutes } from "src/modules/admin/admin.routes";
import { instructorRoutes } from "src/modules/instructor/instructor.routes";

export const appRoutes: readonly AppRoute[] = combineRoutes(
  publicRoutes,
  authRoutes,
  dashboardRoutes,
  adminRoutes,
  instructorRoutes,
);
