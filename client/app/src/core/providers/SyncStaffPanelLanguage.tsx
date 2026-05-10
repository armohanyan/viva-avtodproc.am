import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useLang, type Lang } from "src/lib/i18n";

/**
 * Admin/super-admin and instructor UIs are Armenian-only. When the user enters these routes,
 * force global language to `am` and restore their previous choice when they leave.
 * (Nested context is not enough for every subtree / portal / timing edge case.)
 */
export function SyncStaffPanelLanguage(): null {
  const [location] = useLocation();
  const { lang, setLang } = useLang();
  const savedLangRef = useRef<Lang | null>(null);
  const langRef = useRef(lang);
  const isStaffRoute =
    location.startsWith("/admin") ||
    location.startsWith("/super-admin") ||
    location.startsWith("/superadmin") ||
    location.startsWith("/instructor");

  useLayoutEffect(() => {
    langRef.current = lang;
  }, [lang]);

  useEffect(() => {
    if (isStaffRoute) {
      if (savedLangRef.current === null) {
        savedLangRef.current = langRef.current;
      }
      setLang("am");
    } else {
      const prev = savedLangRef.current;
      if (prev !== null) {
        savedLangRef.current = null;
        setLang(prev);
      }
    }
  }, [isStaffRoute, setLang]);

  return null;
}
