import { useCallback, useEffect, useState } from "react";
import { vivaApiJson } from "src/lib/vivaApi";
import {
  DEFAULT_PRACTICAL_SLOT_PLAN,
  normalizePracticalSlotPlan,
  type PracticalSlotPlanRow,
} from "./practical-slot-plan";

type PlanResponse = { rows?: unknown; instructorUserId?: number; customized?: boolean };

export function useInstructorPracticalSlotPlan(instructorId: string, enabled = true) {
  const [rows, setRows] = useState<PracticalSlotPlanRow[]>(() =>
    DEFAULT_PRACTICAL_SLOT_PLAN.map((r) => ({ ...r })),
  );
  const [customized, setCustomized] = useState(false);
  const [loading, setLoading] = useState(enabled && Boolean(instructorId.trim()));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const iid = instructorId.trim();
    if (!iid) {
      setRows(DEFAULT_PRACTICAL_SLOT_PLAN.map((r) => ({ ...r })));
      setCustomized(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await vivaApiJson<PlanResponse>(
        `/instructors/${encodeURIComponent(iid)}/practical-slot-plan`,
      );
      setRows(normalizePracticalSlotPlan(data?.rows));
      setCustomized(Boolean(data?.customized));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load instructor slot plan");
      setRows(DEFAULT_PRACTICAL_SLOT_PLAN.map((r) => ({ ...r })));
      setCustomized(false);
    } finally {
      setLoading(false);
    }
  }, [instructorId]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void refresh();
  }, [enabled, refresh]);

  return { rows, customized, loading, error, refresh, setRows, setCustomized };
}
