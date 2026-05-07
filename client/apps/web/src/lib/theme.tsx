import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});

const STORAGE_KEY = "viva_theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;

  const prefersDark =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

function applyThemeClass(theme: Theme) {
  // Tailwind `dark:` in this project is implemented via `.dark *` custom variant,
  // so we toggle the `dark` class on the document root.
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always start with "light" so SSR and the client's first render match. Reading
  // localStorage / matchMedia in useState would diverge from the server and break hydration.
  const [theme, setThemeState] = useState<Theme>("light");
  const didRestoreTheme = useRef(false);

  // Restore persisted / system theme once, then keep class + storage aligned with state.
  useLayoutEffect(() => {
    if (!didRestoreTheme.current) {
      didRestoreTheme.current = true;
      const initial = getInitialTheme();
      setThemeState(initial);
      applyThemeClass(initial);
      try {
        window.localStorage.setItem(STORAGE_KEY, initial);
      } catch {
        // Ignore storage failures (private mode, etc.)
      }
      return;
    }
    applyThemeClass(theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore storage failures (private mode, etc.)
    }
  }, [theme]);

  // If user hasn't explicitly chosen a theme, follow system changes.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return;

    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;

    const onChange = () => setThemeState(media.matches ? "dark" : "light");
    onChange();

    if (typeof media.addEventListener === "function") media.addEventListener("change", onChange);
    else media.addListener(onChange);

    return () => {
      if (typeof media.removeEventListener === "function") media.removeEventListener("change", onChange);
      else media.removeListener(onChange);
    };
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
