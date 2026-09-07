import { useCallback, useEffect, useMemo, useState } from "react";
import { vivaApiJson } from "src/lib/vivaApi";
import {
  DEFAULT_PRACTICAL_SLOT_PLAN,
  normalizePracticalSlotPlan,
  type PracticalSlotPlanRow,
  type PracticalWorkWindow,
} from "./practical-slot-plan";

type PlanResponse = {
  rows?: unknown;
  instructorUserId?: number;
  customized?: boolean;
  workWindow?: PracticalWorkWindow | null;
};

type SavedState = {
  rows: PracticalSlotPlanRow[];
  workWindow: PracticalWorkWindow | null;
};

function emptyWorkWindow(): PracticalWorkWindow {
  return { start: "", end: "" };
}

export function normalizeWorkWindowInput(
  raw: PracticalWorkWindow,
): PracticalWorkWindow | null {
  const start = raw.start.trim();
  const end = raw.end.trim();
  if (!start && !end) return null;
  if (!start || !end) return null;
  return { start, end };
}

export function useInstructorPracticalSlotPlan(instructorId: string, enabled = true) {
  const [rows, setRows] = useState<PracticalSlotPlanRow[]>(() =>
    DEFAULT_PRACTICAL_SLOT_PLAN.map((r) => ({ ...r })),
  );
  const [workWindow, setWorkWindow] = useState<PracticalWorkWindow>(emptyWorkWindow);
  const [savedState, setSavedState] = useState<SavedState>(() => ({
    rows: DEFAULT_PRACTICAL_SLOT_PLAN.map((r) => ({ ...r })),
    workWindow: null,
  }));
  const [customized, setCustomized] = useState(false);
  const [loading, setLoading] = useState(enabled && Boolean(instructorId.trim()));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const iid = instructorId.trim();
    if (!iid) {
      const defaults = DEFAULT_PRACTICAL_SLOT_PLAN.map((r) => ({ ...r }));
      setRows(defaults);
      setWorkWindow(emptyWorkWindow());
      setSavedState({ rows: defaults, workWindow: null });
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
      const nextWindow = data?.workWindow?.start && data?.workWindow?.end
        ? { start: data.workWindow.start, end: data.workWindow.end }
        : null;
      setRows(next);
      setWorkWindow(nextWindow ? { ...nextWindow } : emptyWorkWindow());
      setSavedState({ rows: next, workWindow: nextWindow });
      setCustomized(Boolean(data?.customized));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load instructor slot plan");
      const defaults = DEFAULT_PRACTICAL_SLOT_PLAN.map((r) => ({ ...r }));
      setRows(defaults);
      setWorkWindow(emptyWorkWindow());
      setSavedState({ rows: defaults, workWindow: null });
      setCustomized(false);
    } finally {
      setLoading(false);
    }
  }, [instructorId]);

  const dirty = useMemo(() => {
    const nextWindow = normalizeWorkWindowInput(workWindow);
    if (JSON.stringify(rows) !== JSON.stringify(savedState.rows)) return true;
    const savedStart = savedState.workWindow?.start ?? "";
    const savedEnd = savedState.workWindow?.end ?? "";
    const nextStart = nextWindow?.start ?? "";
    const nextEnd = nextWindow?.end ?? "";
    return savedStart !== nextStart || savedEnd !== nextEnd;
  }, [rows, workWindow, savedState]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void refresh();
  }, [enabled, refresh]);

  return {
    rows,
    workWindow,
    customized,
    dirty,
    loading,
    error,
    refresh,
    setRows,
    setWorkWindow,
    setCustomized,
  };
}
