import { createContext, useContext, useMemo, type ReactElement, type ReactNode } from "react";

export type AppNavigationValue = {
  pathname: string;
  navigate: (href: string) => void;
};

const AppNavigationContext = createContext<AppNavigationValue | null>(null);

export function AppNavigationProvider({
  value,
  children,
}: {
  value: AppNavigationValue;
  children: ReactNode;
}): ReactElement {
  const memo = useMemo(() => value, [value.pathname, value.navigate]);
  return <AppNavigationContext.Provider value={memo}>{children}</AppNavigationContext.Provider>;
}

export function useAppNavigation(): AppNavigationValue {
  const v = useContext(AppNavigationContext);
  if (!v) {
    throw new Error("useAppNavigation must be used within AppNavigationProvider");
  }
  return v;
}
