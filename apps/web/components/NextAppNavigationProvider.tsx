"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, type ReactElement, type ReactNode } from "react";
import { AppNavigationProvider, type AppNavigationValue } from "src/lib/navigation/AppNavigationContext";

export function NextAppNavigationProvider({ children }: { children: ReactNode }): ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const navigate = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router],
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
