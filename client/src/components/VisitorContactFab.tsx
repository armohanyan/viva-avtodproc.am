"use client";

import type { ReactElement } from "react";
import { useLocation } from "wouter";
import { VisitorContactFabCore } from "src/components/VisitorContactFabCore";

export function VisitorContactFab(): ReactElement | null {
  const [pathname] = useLocation();
  return <VisitorContactFabCore pathname={pathname} />;
}
