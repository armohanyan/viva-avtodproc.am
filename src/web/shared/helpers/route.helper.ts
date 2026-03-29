import type { AppRoute } from "@/shared/types/router.types";

export const combineRoutes = (...routeGroups: readonly AppRoute[][]): AppRoute[] =>
  routeGroups.flatMap((group) => group);
