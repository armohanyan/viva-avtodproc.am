import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [savedJson, setSavedJson] = useState<string>(() =>
    JSON.stringify(DEFAULT_PRACTICAL_SLOT_PLAN),
  );
  const [customized, setCustomized] = useState(false);
  const [loading, setLoading] = useState(enabled && Boolean(instructorId.trim()));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const iid = instructorId.trim();
    if (!iid) {
      const defaults = DEFAULT_PRACTICAL_SLOT_PLAN.map((r) => ({ ...r }));
      setRows(defaults);
      setSavedJson(JSON.stringify(defaults));
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
      const next = normalizePracticalSlotPlan(data?.rows);
      setRows(next);
      setSavedJson(JSON.stringify(next));
      setCustomized(Boolean(data?.customized));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load instructor slot plan");
      const defaults = DEFAULT_PRACTICAL_SLOT_PLAN.map((r) => ({ ...r }));
      setRows(defaults);
      setSavedJson(JSON.stringify(defaults));
      setCustomized(false);
    } finally {
      setLoading(false);
    }
  }, [instructorId]);

  /** True when local rows differ from the last server state (unsaved edits). */
  const dirty = useMemo(() => JSON.stringify(rows) !== savedJson, [rows, savedJson]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void refresh();
  }, [enabled, refresh]);

  return { rows, customized, dirty, loading, error, refresh, setRows, setCustomized };
}
