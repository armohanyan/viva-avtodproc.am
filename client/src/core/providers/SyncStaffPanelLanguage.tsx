import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useLang, type Lang } from "src/lib/i18n";

/**
 * Admin and instructor UIs are Armenian-only. When the user enters these routes,
 * force global language to `am` and restore their previous choice when they leave.
 * (Nested context is not enough for every subtree / portal / timing edge case.)
 */
export function SyncStaffPanelLanguage(): null {
  const [location] = useLocation();
  const { lang, setLang } = useLang();
  const savedLangRef = useRef<Lang | null>(null);
  const langRef = useRef(lang);
  langRef.current = lang;

  useEffect(() => {
    const staff = location.startsWith("/admin") || location.startsWith("/instructor");
    if (staff) {
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
  }, [location, setLang]);

  return null;
}
