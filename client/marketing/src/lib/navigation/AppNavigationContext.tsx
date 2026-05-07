import {
  createContext,
  useContext,
  useMemo,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from "react";
import type { MarketingNavLinkProps } from "src/lib/navigation/marketingNavLink.types";

export type AppNavigationValue = {
  pathname: string;
  navigate: (href: string) => void;
  /**
   * Vite panel origin for auth/dashboard when marketing runs on another origin (e.g. Next on :3000).
   * Empty string means the panel is served on the same host (path routing).
   */
  panelBaseUrl: string;
  /**
   * Next marketing origin when the panel is separate (e.g. Vite on :5173). Used for “logout / back to site”.
   * Empty string means marketing is same origin.
   */
  marketingBaseUrl: string;
  panelHref: (path: string) => string;
  marketingHref: (path: string) => string;
  MarketingLink: ComponentType<MarketingNavLinkProps>;
};

const AppNavigationContext = createContext<AppNavigationValue | null>(null);

export function AppNavigationProvider({
  value,
  children,
}: {
  value: AppNavigationValue;
  children: ReactNode;
}): ReactElement {
  const memo = useMemo(
    () => value,
    [
      value.pathname,
      value.navigate,
      value.panelBaseUrl,
      value.marketingBaseUrl,
      value.panelHref,
      value.marketingHref,
      value.MarketingLink,
    ],
  );
  return <AppNavigationContext.Provider value={memo}>{children}</AppNavigationContext.Provider>;
}

export function useAppNavigation(): AppNavigationValue {
  const v = useContext(AppNavigationContext);
  if (!v) {
    throw new Error("useAppNavigation must be used within AppNavigationProvider");
  }
  return v;
}
