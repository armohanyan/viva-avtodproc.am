import { useCallback, useState } from "react";
import { Button } from "src/components/ui/button";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import PracticalSlotPlanEditor from "src/modules/booking/PracticalSlotPlanEditor";
import type { PracticalSlotPlanRow } from "src/modules/booking/practical-slot-plan";
import { normalizeTimeHHMM } from "src/modules/booking/booking-slot.util";
import { useInstructorPracticalSlotPlan } from "src/modules/booking/useInstructorPracticalSlotPlan";

type Props = {
  instructorId: string;
};

export default function InstructorPracticalSlotsSection({ instructorId }: Props) {
  const { t } = useLang();
  const { showToast } = useToast();
  const { rows, loading, refresh, setRows, setCustomized } = useInstructorPracticalSlotPlan(
    instructorId,
    Boolean(instructorId.trim()),
  );
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    const iid = instructorId.trim();
    if (!iid) return;
    const invalid = rows.filter((r) => r.time && !normalizeTimeHHMM(r.time));
    if (invalid.length > 0) {
      showToast(t("adminSettingsSlotTimeInvalid"), "error");
      return;
    }
    setSaving(true);
    try {
      const payload: PracticalSlotPlanRow[] = rows.map((r) => ({
        time: r.time ? (normalizeTimeHHMM(r.time) ?? r.time) : null,
      }));
      await vivaApiJson(`/instructors/${encodeURIComponent(iid)}/practical-slot-plan`, {
        method: "PUT",
        body: { rows: payload },
      });
      setCustomized(true);
      showToast(t("instructorPracticalSlotsSaved"), "success");
      await refresh();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }, [instructorId, rows, refresh, showToast, t]);

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
      <div>
        <p className="text-sm font-medium text-foreground">{t("instructorPracticalSlotsTitle")}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t("instructorPracticalSlotsHint")}</p>
      </div>
      <PracticalSlotPlanEditor
        rows={rows}
        loading={loading}
        onChange={setRows}
        onReload={() => void refresh()}
      />
      <div className="flex justify-end pt-1">
        <Button type="button" size="sm" onClick={() => void handleSave()} disabled={saving || loading}>
          {saving ? t("saving") : t("instructorPracticalSlotsSave")}
        </Button>
      </div>
    </div>
  );
}
