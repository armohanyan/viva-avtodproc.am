import { Moon, Sun } from "lucide-react";
import { useTheme } from "src/lib/theme";

import { Button } from "./ui/button";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="border-input"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-primary" aria-hidden />
      ) : (
        <Moon className="h-4 w-4 text-primary" aria-hidden />
      )}
    </Button>
  );
}

