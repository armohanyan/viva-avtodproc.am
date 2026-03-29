import type { AppRoute } from "src/shared/types/router.types";

export const combineRoutes = (...routeGroups: readonly AppRoute[][]): AppRoute[] =>
  routeGroups.flatMap((group) => group);
