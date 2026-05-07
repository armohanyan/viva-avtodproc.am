import type { AppRoute } from "src/types/router.types";
import { combineRoutes } from "src/utils/route.utils";
import { authRoutes } from "src/modules/auth/auth.routes";
import { dashboardRoutes } from "src/modules/dashboard/dashboard.routes";
import { adminRoutes } from "src/modules/admin/admin.routes";
import { instructorRoutes } from "src/modules/instructor/instructor.routes";
import RedirectToMarketing from "src/pages/RedirectToMarketing";

/**
 * Marketing pages live on the Next app; anything else on the Vite origin (e.g. `/`, `/about`)
 * redirects there so the panel never renders an empty `Switch`.
 */
const viteMarketingFallbackRoutes: readonly AppRoute[] = [{ path: "*", component: RedirectToMarketing }];

/** Public marketing routes are served by the Next.js app (`marketing`) for SEO. */
export const appRoutes: readonly AppRoute[] = combineRoutes(
  authRoutes,
  dashboardRoutes,
  adminRoutes,
  instructorRoutes,
  viteMarketingFallbackRoutes,
);
