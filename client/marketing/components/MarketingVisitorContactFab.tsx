"use client";

import type { ReactElement } from "react";
import { useAppNavigation } from "src/lib/navigation/AppNavigationContext";
import { VisitorContactFabCore } from "src/components/VisitorContactFabCore";

export function MarketingVisitorContactFab(): ReactElement | null {
  const { pathname } = useAppNavigation();
  return <VisitorContactFabCore pathname={pathname} />;
}
