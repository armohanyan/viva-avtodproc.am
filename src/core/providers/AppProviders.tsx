import type { PropsWithChildren } from "react";
import { Provider } from "src/components/provider";
import { SyncStaffPanelLanguage } from "src/core/providers/SyncStaffPanelLanguage";
import { StudentEntitlementsProvider } from "src/modules/dashboard/studentEntitlements";
import { LangProvider } from "src/lib/i18n";
import { ToastProvider } from "src/lib/toast";

export const AppProviders = ({ children }: PropsWithChildren): JSX.Element => (
  <Provider>
    <LangProvider>
      <SyncStaffPanelLanguage />
      <ToastProvider>
        <StudentEntitlementsProvider>{children}</StudentEntitlementsProvider>
      </ToastProvider>
    </LangProvider>
  </Provider>
);
