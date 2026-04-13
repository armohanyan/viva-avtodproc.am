import { useSearch } from "wouter";
import { useMemo } from "react";

/** `?student=` and optional `?branch=` when opening learn flows from the student list. */
export function useAdminLearnSearchParams(): {
  studentId: string | null;
  branchId: string | null;
} {
  const search = useSearch();
  return useMemo(() => {
    const p = new URLSearchParams(search);
    const rawStudent = p.get("student");
    const rawBranch = p.get("branch");
    const studentId =
      rawStudent && /^[A-Za-z0-9._-]{1,80}$/.test(rawStudent.trim()) ? rawStudent.trim() : null;
    const branchId = rawBranch?.trim() || null;
    return { studentId, branchId };
  }, [search]);
}
