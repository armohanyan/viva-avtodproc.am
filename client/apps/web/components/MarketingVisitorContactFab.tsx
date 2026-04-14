"use client";

import type { ReactElement } from "react";
import { usePathname } from "next/navigation";
import { VisitorContactFabCore } from "src/components/VisitorContactFabCore";

export function MarketingVisitorContactFab(): ReactElement | null {
  const pathname = usePathname();
  return <VisitorContactFabCore pathname={pathname} />;
}
