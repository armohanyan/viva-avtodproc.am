import type { PropsWithChildren } from "react";
import { Provider } from "src/components/provider";
import { LangProvider } from "src/lib/i18n";
import { ToastProvider } from "src/lib/toast";

export const AppProviders = ({ children }: PropsWithChildren): JSX.Element => (
  <Provider>
    <LangProvider>
      <ToastProvider>{children}</ToastProvider>
    </LangProvider>
  </Provider>
);
