import { useEffect } from "react";
import { useAccount } from "src/modules/accounts";
import {
  mergeStoredExamStatsFromServer,
  type StoredExamStats,
} from "src/lib/examStats";
import { vivaApiJson } from "src/lib/vivaApi";

/**
 * Loads exam quiz progress from the API into localStorage and debounces saves back to the server
 * for the logged-in student (per-account, cross-device).
 */
export default function StudentExamStatsSync(): null {
  const { user } = useAccount();

  useEffect(() => {
    if (user?.accountType !== "student" || !user.id) {
      return;
    }
    const studentId = user.id;

    let cancelled = false;
    void (async () => {
      try {
        const remote = await vivaApiJson<StoredExamStats>(`/students/${encodeURIComponent(studentId)}/exam-stats`);
        if (cancelled) return;
        mergeStoredExamStatsFromServer(remote);
      } catch {
        /* not logged in to API or network error */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.accountType, user?.id]);

  return null;
}
