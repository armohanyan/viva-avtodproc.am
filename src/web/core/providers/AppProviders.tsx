import type { PropsWithChildren } from "react";
import { Provider } from "@/components/provider";
import { LangProvider } from "@/lib/i18n";
import { ToastProvider } from "@/lib/toast";

export const AppProviders = ({ children }: PropsWithChildren): JSX.Element => (
  <Provider>
    <LangProvider>
      <ToastProvider>{children}</ToastProvider>
    </LangProvider>
  </Provider>
);
