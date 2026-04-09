"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, type ReactElement, type ReactNode } from "react";
import { AppNavigationProvider, type AppNavigationValue } from "src/lib/navigation/AppNavigationContext";
import { joinAppPath, normalizeAppBase } from "src/lib/navigation/crossApp";
import { NextMarketingNavLink } from "./NextMarketingNavLink";

function panelBaseFromEnv(): string {
  const raw = process.env.NEXT_PUBLIC_PANEL_URL?.trim();
  if (raw) return normalizeAppBase(raw);
  if (process.env.NODE_ENV === "development") return "http://localhost:5173";
  return "";
}

export function NextAppNavigationProvider({ children }: { children: ReactNode }): ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const navigate = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router],
  );

  const panelBaseUrl = useMemo(() => panelBaseFromEnv(), []);
  const marketingBaseUrl = "";

  const panelHref = useCallback((path: string) => joinAppPath(panelBaseUrl, path), [panelBaseUrl]);
  const marketingHref = useCallback((path: string) => joinAppPath(marketingBaseUrl, path), [marketingBaseUrl]);

  const value = useMemo<AppNavigationValue>(
    () => ({
      pathname,
      navigate,
      panelBaseUrl,
      marketingBaseUrl,
      panelHref,
      marketingHref,
      MarketingLink: NextMarketingNavLink,
    }),
    [pathname, navigate, panelBaseUrl, marketingBaseUrl, panelHref, marketingHref],
  );

  return <AppNavigationProvider value={value}>{children}</AppNavigationProvider>;
}
