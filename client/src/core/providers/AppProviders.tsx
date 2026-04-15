import {JSX, PropsWithChildren} from "react";
import { Provider } from "src/components/provider";
import { VisitorContactFab } from "src/components/VisitorContactFab";
import { SyncStaffPanelLanguage } from "src/core/providers/SyncStaffPanelLanguage";
import { AccountProvider } from "src/modules/accounts";
import { StudentEntitlementsProvider } from "src/modules/dashboard/studentEntitlements";
import { LangProvider } from "src/lib/i18n";
import { ToastProvider } from "src/lib/toast";

export const AppProviders = ({ children }: PropsWithChildren): JSX.Element => (
  <Provider>
    <LangProvider>
      <SyncStaffPanelLanguage />
      <ToastProvider>
        <AccountProvider>
          <StudentEntitlementsProvider>
            {children}
            <VisitorContactFab />
          </StudentEntitlementsProvider>
        </AccountProvider>
      </ToastProvider>
    </LangProvider>
  </Provider>
);
