"use client";

import type { ReactElement, ReactNode } from "react";
import { Provider } from "src/components/provider";
import { LangProvider } from "src/lib/i18n";
import { ToastProvider } from "src/lib/toast";
import { AccountProvider } from "src/modules/accounts";
import StudentExamStatsSync from "src/modules/dashboard/StudentExamStatsSync";
import { NextAppNavigationProvider } from "./NextAppNavigationProvider";
import { MarketingVisitorContactFab } from "./MarketingVisitorContactFab";

export function MarketingProviders({ children }: { children: ReactNode }): ReactElement {
  return (
    <Provider>
      <LangProvider>
        <NextAppNavigationProvider>
          <ToastProvider>
            <AccountProvider>
              <StudentExamStatsSync />
              {children}
              <MarketingVisitorContactFab />
            </AccountProvider>
          </ToastProvider>
        </NextAppNavigationProvider>
      </LangProvider>
    </Provider>
  );
}
