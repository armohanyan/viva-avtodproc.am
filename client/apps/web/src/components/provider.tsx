"use client";

import type { PropsWithChildren } from "react";
import { GlobalApiRequestLoader } from "src/components/GlobalApiRequestLoader";
import { ThemeProvider } from "src/lib/theme";

export function Provider({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <GlobalApiRequestLoader />
      {children}
    </ThemeProvider>
  );
}
