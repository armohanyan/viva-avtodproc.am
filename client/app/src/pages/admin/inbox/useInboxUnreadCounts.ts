import { useCallback, useEffect, useState } from "react";
import { vivaApiJson } from "src/lib/vivaApi";

export type InboxUnreadCounts = {
  theoryPersonal: number;
  bookedCalls: number;
  contactRequests: number;
};

const EMPTY: InboxUnreadCounts = {
  theoryPersonal: 0,
  bookedCalls: 0,
  contactRequests: 0,
};

export function useInboxUnreadCounts() {
  const [counts, setCounts] = useState<InboxUnreadCounts>(EMPTY);

  const refresh = useCallback(async () => {
    try {
      const [theory, calls, contact] = await Promise.all([
        vivaApiJson<{ status: string }[]>("/personal-theory-lesson-requests"),
        vivaApiJson<{ status: string }[]>("/booked-calls"),
        vivaApiJson<{ status: string }[]>("/contact-requests"),
      ]);
      setCounts({
        theoryPersonal: Array.isArray(theory) ? theory.filter((r) => r.status === "pending").length : 0,
        bookedCalls: Array.isArray(calls) ? calls.filter((r) => r.status === "pending").length : 0,
        contactRequests: Array.isArray(contact) ? contact.filter((r) => r.status === "active").length : 0,
      });
    } catch {
      setCounts(EMPTY);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { counts, refresh };
}
