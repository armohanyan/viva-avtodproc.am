"use client";

import { useEffect } from "react";
import { useAppNavigation } from "src/lib/navigation/AppNavigationContext";

export function ScrollToTopOnRoute(): null {
  const { pathname } = useAppNavigation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
