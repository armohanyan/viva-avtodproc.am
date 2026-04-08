"use client";

import type { ReactElement, ReactNode } from "react";
import { Provider } from "src/components/provider";
import { LangProvider } from "src/lib/i18n";
import { ToastProvider } from "src/lib/toast";
import { NextAppNavigationProvider } from "./NextAppNavigationProvider";

export function MarketingProviders({ children }: { children: ReactNode }): ReactElement {
  return (
    <Provider>
      <LangProvider>
        <NextAppNavigationProvider>
          <ToastProvider>{children}</ToastProvider>
        </NextAppNavigationProvider>
      </LangProvider>
    </Provider>
  );
}
