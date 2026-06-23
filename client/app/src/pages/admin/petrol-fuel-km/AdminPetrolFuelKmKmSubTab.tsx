import AdminTableScroll from "src/components/AdminTableScroll";
import AdminTableRowActions, { AdminTableRowContextMenu } from "src/components/AdminTableRowActions";
import ConfirmDialog from "src/components/ConfirmDialog";
import { Button } from "src/components/ui/button";
import { Card } from "src/components/ui/card";
import { Input } from "src/components/ui/input";
import { useLang } from "src/lib/i18n";
import { yerevanTodayIso } from "src/lib/yerevanLessonCalendar";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { useOptionalAdminBranchFilterRevision } from "src/modules/admin/AdminBranchFilterProvider";
import { useInstructors } from "src/modules/instructors/useInstructors";
import type {
  InstructorKmLogBody,
  InstructorKmLogListResponse,
  InstructorKmLogRow,
} from "src/types/instructor-km-log.types";
import { formatShortDateFromIso } from "src/utils/locale.utils";
import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type KmFormState = {
  date: string;
  instructorUserId: string;
  km: string;
};

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function emptyForm(dateIso: string): KmFormState {
  return { date: dateIso, instructorUserId: "", km: "" };
}

function buildBody(form: KmFormState): InstructorKmLogBody | null {
  const instructorUserId = Number.parseInt(form.instructorUserId, 10);
  const date = form.date.slice(0, 10);
  const km = Number.parseFloat(form.km.replace(",", "."));

  if (
    !Number.isFinite(instructorUserId) ||
    instructorUserId <= 0 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(km) ||
    km <= 0
  ) {
    return null;
  }

  return { instructorUserId, date, km };
}

export default function AdminPetrolFuelKmKmSubTab() {
  const branchFilterRevision = useOptionalAdminBranchFilterRevision();
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const { instructors } = useInstructors();

  const todayIso = useMemo(() => yerevanTodayIso(), []);
  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(todayIso);
  const [form, setForm] = useState(() => emptyForm(todayIso));
  const [items, setItems] = useState<InstructorKmLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteRow, setDeleteRow] = useState<InstructorKmLogRow | null>(null);

  const practicalInstructors = useMemo(
    () =>
      instructors
        .filter((i) => i.teachesPractical && i.status === "active")
        .sort((a, b) => a.name.localeCompare(b.name, "hy")),
    [instructors],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        startDate: startDate.slice(0, 10),
        endDate: endDate.slice(0, 10),
      });
      const res = await vivaApiJson<InstructorKmLogListResponse>(
        `/admin/instructor-km-logs?${qs.toString()}`,
      );
      setItems(res.items);
    } catch (e) {
      setItems([]);
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, showToast]);

  useEffect(() => {
    void load();
  }, [load, branchFilterRevision]);

  const handleRegister = async () => {
    const body = buildBody(form);
    if (!body) {
      showToast(t("adminPetrolFuelKmFormInvalid"), "error");
      return;
    }
    setSaving(true);
    try {
      await vivaApiJson("/admin/instructor-km-logs", { method: "POST", body });
      setForm(emptyForm(todayIso));
      showToast(t("adminPetrolFuelKmKmSavedToast"), "success");
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    setSaving(true);
    try {
      await vivaApiJson(`/admin/instructor-km-logs/${deleteRow.id}`, { method: "DELETE" });
      setDeleteRow(null);
      showToast(t("adminPetrolFuelKmKmDeletedToast"), "success");
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 border-border space-y-4">
        <h3 className="text-lg font-semibold text-primary">{t("adminPetrolFuelKmSectionKm")}</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">{t("adminPetrolColDate")}</label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="h-10"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">{t("adminPetrolFieldInstructor")}</label>
            <select
              className={selectClass}
              value={form.instructorUserId}
              onChange={(e) => setForm({ ...form, instructorUserId: e.target.value })}
            >
              <option value="">{t("adminPetrolPickInstructor")}</option>
              {practicalInstructors.map((ins) => (
                <option key={ins.id} value={ins.id}>
                  {ins.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">{t("adminPetrolFuelKmColKm")}</label>
            <Input
              value={form.km}
              onChange={(e) => setForm({ ...form, km: e.target.value })}
              className="h-10"
              inputMode="decimal"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={saving}
              onClick={handleRegister}
            >
              {t("adminPetrolFuelKmRegisterKm")}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4 border-border space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">{t("adminPetrolFilterFrom")}</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 w-[11rem]"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">{t("adminPetrolFilterTo")}</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 w-[11rem]"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={() => {
              setStartDate(todayIso);
              setEndDate(todayIso);
            }}
          >
            {t("adminPetrolFilterToday")}
          </Button>
        </div>

        <AdminTableScroll>
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-3 py-2">{t("adminPetrolColDate")}</th>
                <th className="px-3 py-2">{t("adminPetrolColInstructor")}</th>
                <th className="px-3 py-2 text-right">{t("adminPetrolFuelKmColKm")}</th>
                <th className="px-3 py-2 w-12" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                    {t("loading")}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                    {t("adminPetrolFuelKmKmTableEmpty")}
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <AdminTableRowContextMenu
                    key={row.id}
                    actions={[
                      {
                        label: t("delete"),
                        icon: Trash2,
                        destructive: true,
                        onClick: () => setDeleteRow(row),
                      },
                    ]}
                  >
                    <tr className="border-b hover:bg-muted/30">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatShortDateFromIso(row.date, lang)}
                      </td>
                      <td className="px-3 py-2">{row.instructorName}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.km}</td>
                      <td className="px-3 py-2">
                        <AdminTableRowActions
                          actions={[
                            {
                              label: t("delete"),
                              icon: Trash2,
                              destructive: true,
                              onClick: () => setDeleteRow(row),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  </AdminTableRowContextMenu>
                ))
              )}
            </tbody>
          </table>
        </AdminTableScroll>
      </Card>

      <ConfirmDialog
        open={!!deleteRow}
        onOpenChange={(o) => !o && setDeleteRow(null)}
        title={t("adminPetrolFuelKmKmDeleteTitle")}
        description={t("adminPetrolFuelKmKmDeleteDesc")}
        confirmLabel={t("delete")}
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
