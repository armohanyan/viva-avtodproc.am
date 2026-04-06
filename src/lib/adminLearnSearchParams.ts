import { useSearch } from "wouter";
import { useMemo } from "react";
import { DEMO_STUDENTS } from "src/modules/admin/adminPeople";

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
      rawStudent && DEMO_STUDENTS.some((s) => s.id === rawStudent) ? rawStudent : null;
    const branchId = rawBranch?.trim() || null;
    return { studentId, branchId };
  }, [search]);
}
