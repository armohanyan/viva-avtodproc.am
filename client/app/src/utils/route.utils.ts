import type { AppRoute } from "src/types/router.types";

export const combineRoutes = (...routeGroups: readonly (readonly AppRoute[])[]): AppRoute[] =>
  routeGroups.flatMap((group) => [...group]);
