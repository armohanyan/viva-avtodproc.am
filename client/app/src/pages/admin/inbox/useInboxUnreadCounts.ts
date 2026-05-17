import { useCallback, useEffect, useState } from "react";
import { vivaApiJson } from "src/lib/vivaApi";
import { useAdminBranchFilter } from "src/modules/admin/AdminBranchFilterProvider";

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
  const { branchId: filterBranchId } = useAdminBranchFilter();
  const [counts, setCounts] = useState<InboxUnreadCounts>(EMPTY);

  const refresh = useCallback(async () => {
    try {
      const [theory, calls, contact] = await Promise.all([
        vivaApiJson<{ status: string; branchId?: number }[]>("/personal-theory-lesson-requests"),
        vivaApiJson<{ status: string }[]>("/booked-calls"),
        vivaApiJson<{ status: string }[]>("/contact-requests"),
      ]);
      const theoryRows = Array.isArray(theory) ? theory : [];
      const theoryForBranch = filterBranchId
        ? theoryRows.filter((r) => String(r.branchId) === filterBranchId)
        : theoryRows;
      setCounts({
        theoryPersonal: theoryForBranch.filter((r) => r.status === "pending").length,
        bookedCalls: Array.isArray(calls) ? calls.filter((r) => r.status === "pending").length : 0,
        contactRequests: Array.isArray(contact) ? contact.filter((r) => r.status === "active").length : 0,
      });
    } catch {
      setCounts(EMPTY);
    }
  }, [filterBranchId]);

  useEffect(() => {
    void refresh();
  }, [refresh, filterBranchId]);

  return { counts, refresh };
}
