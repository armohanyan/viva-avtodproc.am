import { useMemo } from "react";
import { resolveEffectiveBookableTimes } from "./practical-slot-plan";
import { useInstructorPracticalSlotPlan } from "./useInstructorPracticalSlotPlan";
import { usePracticalSlotPlan } from "./usePracticalSlotPlan";

/** Branch school grid ∩ instructor working slots for practical booking UIs. */
export function useEffectivePracticalSlots(branchId: string, instructorId: string, enabled = true) {
  const branchEnabled = enabled && Boolean(branchId.trim());
  const instructorEnabled = enabled && Boolean(instructorId.trim());

  const branch = usePracticalSlotPlan(branchId, branchEnabled);
  const instructor = useInstructorPracticalSlotPlan(instructorId, instructorEnabled);

  const effectiveTimes = useMemo(
    () => resolveEffectiveBookableTimes(branch.rows, instructor.rows, instructor.customized),
    [branch.rows, instructor.rows, instructor.customized],
  );

  return {
    effectiveTimes,
    branchPlan: branch.rows,
    instructorPlan: instructor.rows,
    instructorCustomized: instructor.customized,
    loading: branch.loading || instructor.loading,
    branch,
    instructor,
  };
}
