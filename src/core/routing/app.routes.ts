import type { AppRoute } from "src/shared/types/router.types";
import { combineRoutes } from "src/shared/helpers/route.helper";
import { authRoutes } from "src/modules/auth/auth.routes";
import { dashboardRoutes } from "src/modules/dashboard/dashboard.routes";
import { adminRoutes } from "src/modules/admin/admin.routes";
import { instructorRoutes } from "src/modules/instructor/instructor.routes";

/** Public marketing routes are served by the Next.js app (`apps/web`) for SEO. */
export const appRoutes: readonly AppRoute[] = combineRoutes(
  authRoutes,
  dashboardRoutes,
  adminRoutes,
  instructorRoutes,
);
