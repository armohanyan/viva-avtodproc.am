import { useEffect, useRef } from "react";
import { useAccount } from "src/modules/accounts";
import {
  isStoredExamStatsVisiblyEmpty,
  mergeStoredExamStatsFromServer,
  readStoredExamStatsSnapshot,
  setExamStatsRemoteSaveScheduler,
  type StoredExamStats,
} from "src/lib/examStats";
import { vivaApiJson } from "src/lib/vivaApi";

/**
 * Loads exam quiz progress from the API into localStorage and debounces saves back to the server
 * for the logged-in student (per-account, cross-device).
 */
export default function StudentExamStatsSync(): null {
  const { user } = useAccount();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (user?.accountType !== "student" || !user.id) {
      setExamStatsRemoteSaveScheduler(null);
      return;
    }
    const studentId = user.id;

    const scheduleSave = () => {
      if (saveTimerRef.current != null) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        const body = readStoredExamStatsSnapshot();
        void vivaApiJson<StoredExamStats>(`/students/${encodeURIComponent(studentId)}/exam-stats`, {
          method: "PUT",
          body,
        }).catch(() => {
          /* offline */
        });
      }, 800);
    };

    setExamStatsRemoteSaveScheduler(scheduleSave);

    let cancelled = false;
    void (async () => {
      try {
        const remote = await vivaApiJson<StoredExamStats>(`/students/${encodeURIComponent(studentId)}/exam-stats`);
        if (cancelled) return;
        const local = readStoredExamStatsSnapshot();
        if (!isStoredExamStatsVisiblyEmpty(remote)) {
          mergeStoredExamStatsFromServer(remote);
        } else if (!isStoredExamStatsVisiblyEmpty(local)) {
          await vivaApiJson(`/students/${encodeURIComponent(studentId)}/exam-stats`, {
            method: "PUT",
            body: local,
          }).catch(() => {
            /* offline */
          });
        }
      } catch {
        /* not logged in to API or network error */
      }
    })();

    return () => {
      cancelled = true;
      setExamStatsRemoteSaveScheduler(null);
      if (saveTimerRef.current != null) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [user?.accountType, user?.id]);

  return null;
}
