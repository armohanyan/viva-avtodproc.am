import { useCallback, useImperativeHandle, useState, type Ref } from "react";
import { Button } from "src/components/ui/button";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import PracticalSlotPlanEditor from "src/modules/booking/PracticalSlotPlanEditor";
import type { PracticalSlotPlanRow } from "src/modules/booking/practical-slot-plan";
import { normalizeTimeHHMM } from "src/modules/booking/booking-slot.util";
import { useInstructorPracticalSlotPlan } from "src/modules/booking/useInstructorPracticalSlotPlan";

export type InstructorPracticalSlotsSaveHandle = {
  /** Persists unsaved slot edits (no-op when nothing changed). Returns false when the save failed. */
  save: () => Promise<boolean>;
};

type Props = {
  instructorId: string;
  /** Lets a parent form (e.g. the instructor edit modal) save pending slot edits on its own submit. */
  saveRef?: Ref<InstructorPracticalSlotsSaveHandle>;
};

export default function InstructorPracticalSlotsSection({ instructorId, saveRef }: Props) {
  const { t } = useLang();
  const { showToast } = useToast();
  const { rows, dirty, loading, refresh, setRows, setCustomized } = useInstructorPracticalSlotPlan(
    instructorId,
    Boolean(instructorId.trim()),
  );
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async (): Promise<boolean> => {
    const iid = instructorId.trim();
    if (!iid) return false;
    const invalid = rows.filter((r) => r.time && !normalizeTimeHHMM(r.time));
    if (invalid.length > 0) {
      showToast(t("adminSettingsSlotTimeInvalid"), "error");
      return false;
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
      return true;
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
      return false;
    } finally {
      setSaving(false);
    }
  }, [instructorId, rows, refresh, setCustomized, showToast, t]);

  useImperativeHandle(
    saveRef,
    () => ({
      save: async () => (dirty ? handleSave() : true),
    }),
    [dirty, handleSave],
  );

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
