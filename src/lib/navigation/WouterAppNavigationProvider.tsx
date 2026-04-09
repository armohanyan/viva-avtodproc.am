import type { ReactElement, ReactNode } from "react";
import { useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { AppNavigationProvider, type AppNavigationValue } from "src/lib/navigation/AppNavigationContext";
import { joinAppPath } from "src/lib/navigation/crossApp";
import { resolvedViteMarketingOrigin } from "src/lib/navigation/viteMarketingOrigin";
import { WouterMarketingNavLink } from "src/lib/navigation/WouterMarketingNavLink";

export function WouterAppNavigationProvider({ children }: { children: ReactNode }): ReactElement {
  const [pathname, setLocation] = useLocation();
  const navigate = useCallback(
    (href: string) => {
      setLocation(href);
    },
    [setLocation],
  );

  const panelBaseUrl = "";
  const marketingBaseUrl = useMemo(() => resolvedViteMarketingOrigin(), []);

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
      MarketingLink: WouterMarketingNavLink,
    }),
    [pathname, navigate, panelBaseUrl, marketingBaseUrl, panelHref, marketingHref],
  );

  return <AppNavigationProvider value={value}>{children}</AppNavigationProvider>;
}
