import type { ReactElement, ReactNode } from "react";
import { useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { AppNavigationProvider, type AppNavigationValue } from "src/lib/navigation/AppNavigationContext";

export function WouterAppNavigationProvider({ children }: { children: ReactNode }): ReactElement {
  const [pathname, setLocation] = useLocation();
  const navigate = useCallback(
    (href: string) => {
      setLocation(href);
    },
    [setLocation],
  );
  const value = useMemo<AppNavigationValue>(
    () => ({
      pathname,
      navigate,
    }),
    [pathname, navigate],
  );
  return <AppNavigationProvider value={value}>{children}</AppNavigationProvider>;
}
