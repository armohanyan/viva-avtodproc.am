import { useCallback, useEffect, useState } from "react";
import { vivaApiJson } from "src/lib/vivaApi";
import {
  DEFAULT_PRACTICAL_SLOT_PLAN,
  normalizePracticalSlotPlan,
  type PracticalSlotPlanRow,
} from "./practical-slot-plan";

type PlanResponse = { rows?: unknown; branchId?: number };

export function usePracticalSlotPlan(branchId: string, enabled = true) {
  const [rows, setRows] = useState<PracticalSlotPlanRow[]>(() =>
    DEFAULT_PRACTICAL_SLOT_PLAN.map((r) => ({ ...r })),
  );
  const [loading, setLoading] = useState(enabled && Boolean(branchId.trim()));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const bid = branchId.trim();
    if (!bid) {
      setRows(DEFAULT_PRACTICAL_SLOT_PLAN.map((r) => ({ ...r })));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await vivaApiJson<PlanResponse>(
        `/branches/${encodeURIComponent(bid)}/practical-slot-plan`,
      );
      setRows(normalizePracticalSlotPlan(data?.rows));
    } catch {
      try {
        const data = await vivaApiJson<PlanResponse>(
          `/settings/practical-slot-plan?${new URLSearchParams({ branchId: bid }).toString()}`,
        );
        setRows(normalizePracticalSlotPlan(data?.rows));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load slot plan");
        setRows(DEFAULT_PRACTICAL_SLOT_PLAN.map((r) => ({ ...r })));
      }
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void refresh();
  }, [enabled, refresh]);

  return { rows, loading, error, refresh, setRows };
}
