import { useCallback, useEffect, useState } from "react";
import { Settings } from "lucide-react";
import AdminLayout from "src/components/AdminLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Button } from "src/components/ui/button";
import { Label } from "src/components/ui/label";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import PracticalSlotPlanEditor from "src/modules/booking/PracticalSlotPlanEditor";
import { usePracticalSlotPlan } from "src/modules/booking/usePracticalSlotPlan";
import type { PracticalSlotPlanRow } from "src/modules/booking/practical-slot-plan";
import { normalizeTimeHHMM } from "src/modules/booking/booking-slot.util";
import { useBranches } from "src/modules/branches";

export default function AdminSettings() {
  const { t } = useLang();
  const { showToast } = useToast();
  const { branches } = useBranches();
  const [branchId, setBranchId] = useState("");
  const [saving, setSaving] = useState(false);
  const { rows, loading, refresh, setRows } = usePracticalSlotPlan(branchId, Boolean(branchId));

  useEffect(() => {
    if (!branchId && branches.length > 0) {
      setBranchId(branches[0]!.id);
    }
  }, [branchId, branches]);

  const handleSave = useCallback(async () => {
    const bid = branchId.trim();
    if (!bid) {
      showToast(t("adminSettingsSelectBranch"), "error");
      return;
    }
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
      await vivaApiJson("/settings/practical-slot-plan", {
        method: "PUT",
        body: { branchId: Number(bid), rows: payload },
      });
      showToast(t("adminSettingsSlotPlanSaved"), "success");
      await refresh();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }, [branchId, rows, refresh, showToast, t]);

  const selectedBranch = branches.find((b) => b.id === branchId);

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={Settings}
        title={t("adminSettingsTitle")}
        subtitle={t("adminSettingsSubtitle")}
      />

      <div className="rounded-xl border border-border bg-card p-4 max-w-xl">
        <div className="mb-4">
          <Label htmlFor="settings-branch" className="text-sm font-medium">
            {t("adminSettingsBranchLabel")}
          </Label>
          <select
            id="settings-branch"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="mt-1.5 w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">{t("adminSettingsSelectBranch")}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <h2 className="text-sm font-semibold text-foreground mb-1">
          {t("adminSettingsSlotPlanTitle")}
          {selectedBranch ? ` — ${selectedBranch.name}` : ""}
        </h2>
        <p className="text-xs text-muted-foreground mb-4">{t("adminSettingsSlotPlanHint")}</p>

        {!branchId ? (
          <p className="text-sm text-muted-foreground">{t("adminSettingsSelectBranch")}</p>
        ) : (
          <PracticalSlotPlanEditor
            rows={rows}
            loading={loading}
            disabled={!branchId}
            onChange={setRows}
            onReload={() => void refresh()}
          />
        )}

        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-border">
          <Button
            type="button"
            size="sm"
            className="ml-auto"
            onClick={() => void handleSave()}
            disabled={saving || loading || !branchId}
          >
            {saving ? t("saving") : t("save")}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
