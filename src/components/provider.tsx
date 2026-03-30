import type { PropsWithChildren } from "react";
import { ThemeProvider } from "src/lib/theme";

export function Provider({ children }: PropsWithChildren) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
