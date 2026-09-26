import DirectorAddRecordButton from "src/modules/director/components/DirectorAddRecordButton";
import DirectorRecordFormDialog from "src/modules/director/components/DirectorRecordFormDialog";
import DirectorRecordActions from "src/modules/director/components/DirectorRecordActions";
import DirectorDataTable from "src/modules/director/components/DirectorDataTable";
import TableSkeletonRows from "src/components/TableSkeletonRows";
import {
  DirectorField,
  DirectorInput,
  DirectorSelect,
  DirectorTableBody,
  DirectorTableHead,
  DirectorTableTh,
  DirectorTableWrap,
  DirectorTextarea,
} from "src/modules/director/components/DirectorUi";
import {
  createDirectorCompensationRule,
  deleteDirectorCompensationRule,
  fetchDirectorCompensationRules,
  fetchDirectorStaffEmployees,
  updateDirectorCompensationRule,
} from "src/modules/director/director.api";
import { todayIso } from "src/modules/director/director.consts";
import type {
  DirectorCompensationRule,
  DirectorCompensationType,
  DirectorStaffEmployee,
  DirectorStaffEmployeePosition,
} from "src/modules/director/director.types";
import { formatAmd } from "src/pages/admin/finance/adminFinanceShared";
import {
  directorAmd,
  directorDate,
  directorOptionalComment,
  directorText,
} from "src/modules/director/directorFormValues";
import { useDirectorTable } from "src/modules/director/useDirectorTable";
import { useDirectorReload } from "src/modules/director/components/DirectorDateFilters";
import { getApiErrorMessage } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { useCallback, useMemo, useState } from "react";
import { Link } from "wouter";

const POSITION_LABEL: Record<DirectorStaffEmployeePosition, string> = {
  instructor: "Հրահանգիչ",
  theory_teacher: "Տեսության դասախոս",
  instructor_and_theory: "Հրահանգիչ և տեսության դասախոս",
  director: "Տնօրեն",
  admin: "Ադմին",
  cleaner: "Մաքրուհի",
  other: "Այլ",
};

/** What this rule pays for — depends on employee position. */
type PayFocus = "practical" | "theory" | "fixed";

const THEORY_PAY_TYPE_LABEL: Record<"per_theory_lesson" | "per_group", string> = {
  per_theory_lesson: "Ըստ դասի",
  per_group: "Ըստ խմբի",
};

function compensationFromForm(
  payFocus: PayFocus,
  theoryPayType: "per_theory_lesson" | "per_group",
): DirectorCompensationType {
  if (payFocus === "fixed") return "fixed_monthly";
  if (payFocus === "practical") return "hourly_practical";
  return theoryPayType;
}

function roleLabelFor(
  position: DirectorStaffEmployeePosition,
  payFocus: PayFocus,
): string {
  if (payFocus === "practical") return "Հրահանգիչ";
  if (payFocus === "theory") return "Տեսության դասախոս";
  return POSITION_LABEL[position];
}

function positionsForPayFocus(focus: PayFocus): DirectorStaffEmployeePosition[] {
  if (focus === "practical") return ["instructor", "instructor_and_theory"];
  if (focus === "theory") return ["theory_teacher", "instructor_and_theory"];
  return ["director", "admin", "cleaner", "other"];
}

type Props = { reloadKey: number };

export default function DirectorSalaryRulesView({ reloadKey }: Props) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<DirectorCompensationRule[]>([]);
  const [staff, setStaff] = useState<DirectorStaffEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    payFocus: "practical" as PayFocus,
    theoryPayType: "per_theory_lesson" as "per_theory_lesson" | "per_group",
    staffEmployeeId: "",
    rateAmd: "",
    effectiveFrom: todayIso(),
    effectiveTo: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rules, employees] = await Promise.all([
        fetchDirectorCompensationRules(),
        fetchDirectorStaffEmployees(true),
      ]);
      setRows(Array.isArray(rules.items) ? rules.items : []);
      setStaff(Array.isArray(employees.items) ? employees.items : []);
    } catch (e) {
      setRows([]);
      setStaff([]);
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useDirectorReload(load, [reloadKey]);

  const filteredStaff = useMemo(() => {
    const allowed = new Set(positionsForPayFocus(form.payFocus));
    return staff
      .filter((s) => s.isActive && allowed.has(s.position))
      .filter((s) => {
        if (form.payFocus === "fixed") return true;
        // Lesson-based pay needs a linked instructor account
        return s.userId != null && s.userId > 0;
      })
      .sort((a, b) => a.name.localeCompare(b.name, "hy"));
  }, [staff, form.payFocus]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      payFocus: "practical",
      theoryPayType: "per_theory_lesson",
      staffEmployeeId: "",
      rateAmd: "",
      effectiveFrom: todayIso(),
      effectiveTo: "",
      notes: "",
    });
  };

  const closeForm = () => {
    resetForm();
    setFormOpen(false);
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (row: DirectorCompensationRule) => {
    setEditingId(row.id);
    const payFocus: PayFocus =
      row.compensationType === "fixed_monthly"
        ? "fixed"
        : row.compensationType === "hourly_practical"
          ? "practical"
          : "theory";
    setForm({
      payFocus,
      theoryPayType:
        row.compensationType === "per_group" ? "per_group" : "per_theory_lesson",
      staffEmployeeId: row.staffEmployeeId != null ? String(row.staffEmployeeId) : "",
      rateAmd: String(row.rateAmd),
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo ?? "",
      notes: row.notes ?? "",
    });
    setFormOpen(true);
  };

  const submit = async () => {
    const staffEmployeeId = Number(form.staffEmployeeId);
    const rateAmd = directorAmd(form.rateAmd);
    if (!Number.isFinite(staffEmployeeId) || staffEmployeeId <= 0) {
      showToast("Ընտրեք աշխատակցի", "error");
      return;
    }
    if (rateAmd <= 0) {
      showToast("Դրույքը պետք է լինի դրական", "error");
      return;
    }
    const emp = staff.find((s) => s.id === staffEmployeeId);
    const compensationType = compensationFromForm(form.payFocus, form.theoryPayType);
    const roleLabel = roleLabelFor(emp?.position ?? "other", form.payFocus);

    try {
      if (editingId != null) {
        await updateDirectorCompensationRule(editingId, {
          roleLabel,
          rateAmd,
          effectiveFrom: directorDate(form.effectiveFrom),
          effectiveTo: form.effectiveTo.trim() ? directorDate(form.effectiveTo) : null,
          notes: directorOptionalComment(form.notes),
        });
        showToast("Պահված է", "success");
      } else {
        await createDirectorCompensationRule({
          staffEmployeeId,
          compensationType,
          roleLabel: directorText(roleLabel) || roleLabel,
          rateAmd,
          effectiveFrom: directorDate(form.effectiveFrom),
          effectiveTo: form.effectiveTo.trim() ? directorDate(form.effectiveTo) : null,
          notes: directorOptionalComment(form.notes),
        });
        showToast("Ավելացված է", "success");
      }
      closeForm();
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const remove = async (id: number) => {
    try {
      await deleteDirectorCompensationRule(id);
      showToast("Ջնջված է", "success");
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const typeLabel = (t: DirectorCompensationType): string => {
    if (t === "fixed_monthly") return "Ամսական ֆիքսված";
    if (t === "hourly_practical") return "Ժամավճար (պրակտիկ)";
    if (t === "per_theory_lesson") return "Տեսություն · ըստ դասի";
    return "Տեսություն · ըստ խմբի";
  };

  const tableColumns = useMemo(
    () => [
      {
        id: "employee",
        header: "Աշխատակից",
        sortable: true,
        filterable: true,
        sortValue: (r: DirectorCompensationRule) => r.employeeName,
        filterValue: (r: DirectorCompensationRule) => r.employeeName,
        searchValue: (r: DirectorCompensationRule) => `${r.employeeName} ${r.roleLabel}`,
        render: (r: DirectorCompensationRule) => r.employeeName,
      },
      {
        id: "type",
        header: "Դրույքի տեսակ",
        sortable: true,
        filterable: true,
        sortValue: (r: DirectorCompensationRule) => r.compensationType,
        filterValue: (r: DirectorCompensationRule) => typeLabel(r.compensationType),
        searchValue: (r: DirectorCompensationRule) =>
          `${typeLabel(r.compensationType)} ${r.roleLabel}`,
        render: (r: DirectorCompensationRule) => (
          <span>
            {typeLabel(r.compensationType)}
            <span className="block text-xs text-muted-foreground">{r.roleLabel}</span>
          </span>
        ),
      },
      {
        id: "rate",
        header: "Դրույք",
        sortable: true,
        sortValue: (r: DirectorCompensationRule) => r.rateAmd,
        searchValue: (r: DirectorCompensationRule) => formatAmd(r.rateAmd),
        render: (r: DirectorCompensationRule) => formatAmd(r.rateAmd),
      },
      {
        id: "from",
        header: "Սկսում է",
        sortable: true,
        sortValue: (r: DirectorCompensationRule) => r.effectiveFrom,
        searchValue: (r: DirectorCompensationRule) => r.effectiveFrom,
        render: (r: DirectorCompensationRule) => r.effectiveFrom,
      },
      {
        id: "to",
        header: "Ավարտ",
        sortable: true,
        sortValue: (r: DirectorCompensationRule) => r.effectiveTo ?? "9999",
        searchValue: (r: DirectorCompensationRule) =>
          r.effectiveTo ?? "դեռ գործում է",
        render: (r: DirectorCompensationRule) =>
          r.effectiveTo ?? (
            <span className="text-muted-foreground">Դեռ գործում է</span>
          ),
      },
      {
        id: "actions",
        header: "",
        align: "end" as const,
        render: (r: DirectorCompensationRule) => (
          <DirectorRecordActions onEdit={() => openEdit(r)} onDelete={() => void remove(r.id)} />
        ),
      },
    ],
    [],
  );

  const table = useDirectorTable({ rows, columns: tableColumns });

  return (
    <>
      <p className="text-xs text-muted-foreground mb-4">
        Նախ ընտրեք ինչի համար է դրույքը, հետո աշխատակցին։ Աշխատակիցներին կառավարեք{" "}
        <Link href="/admin/director/employees" className="text-primary underline-offset-2 hover:underline">
          Աշխատակիցներ
        </Link>{" "}
        էջում (կարելի է նաև առանց համակարգի հաշվի)։
      </p>
      {loading ? (
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <DirectorTableWrap className="mt-0 border-0 rounded-none">
            <DirectorTableHead>
              {["Աշխատակից", "Դրույքի տեսակ", "Դրույք", "Սկսում է", "Ավարտ", ""].map((h, i) => (
                <DirectorTableTh key={i}>{h}</DirectorTableTh>
              ))}
            </DirectorTableHead>
            <DirectorTableBody>
              <TableSkeletonRows cols={6} cellClassName="py-2.5 px-3" />
            </DirectorTableBody>
          </DirectorTableWrap>
        </div>
      ) : (
        <DirectorDataTable
          table={table}
          columns={tableColumns}
          rowKey={(r) => r.id}
          searchPlaceholder="Որոնել դրույք…"
          toolbarActions={<DirectorAddRecordButton onClick={openCreate} />}
        />
      )}
      <DirectorRecordFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editingId != null ? "Խմբագրել դրույք" : "Նոր դրույք"}
        editing={editingId != null}
        createLabel="Պահել"
        onSubmit={() => void submit()}
        onCancel={closeForm}
      >
        <DirectorField label="Ինչի համար է դրույքը">
          <DirectorSelect
            value={form.payFocus}
            onChange={(e) => {
              const payFocus = e.target.value as PayFocus;
              setForm((f) => ({
                ...f,
                payFocus,
                staffEmployeeId: "",
              }));
            }}
            disabled={editingId != null}
          >
            <option value="practical">Պրակտիկ հրահանգիչ (ժամավճար)</option>
            <option value="theory">Տեսության դասախոս</option>
            <option value="fixed">Ամսական ֆիքսված աշխատավարձ</option>
          </DirectorSelect>
        </DirectorField>

        {form.payFocus === "theory" ? (
          <DirectorField label="Տեսության վճարման տեսակ">
            <DirectorSelect
              value={form.theoryPayType}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  theoryPayType: e.target.value as "per_theory_lesson" | "per_group",
                }))
              }
              disabled={editingId != null}
            >
              <option value="per_theory_lesson">{THEORY_PAY_TYPE_LABEL.per_theory_lesson}</option>
              <option value="per_group">{THEORY_PAY_TYPE_LABEL.per_group}</option>
            </DirectorSelect>
          </DirectorField>
        ) : null}

        <DirectorField label="Աշխատակից">
          <DirectorSelect
            value={form.staffEmployeeId}
            onChange={(e) => setForm((f) => ({ ...f, staffEmployeeId: e.target.value }))}
            disabled={editingId != null}
          >
            <option value="">—</option>
            {filteredStaff.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
                {s.position === "instructor_and_theory" ? " (հրահանգիչ + տեսություն)" : ""}
                {s.userId == null ? " · առանց հաշվի" : ""}
              </option>
            ))}
          </DirectorSelect>
        </DirectorField>
        {filteredStaff.length === 0 ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Այս տեսակի համար աշխատակից չկա։ Ավելացրեք{" "}
            <Link href="/admin/director/employees" className="underline">
              Աշխատակիցներ
            </Link>{" "}
            էջում
            {form.payFocus !== "fixed" ? " և կապեք հրահանգչի հաշվի հետ" : ""}.
          </p>
        ) : null}

        <DirectorField
          label={
            form.payFocus === "fixed"
              ? "Ամսական գումար (AMD)"
              : form.payFocus === "practical"
                ? "Ժամավճար (AMD)"
                : form.theoryPayType === "per_group"
                  ? "Գումար մեկ խմբի համար (AMD)"
                  : "Գումար մեկ դասի համար (AMD)"
          }
        >
          <DirectorInput
            value={form.rateAmd}
            onChange={(e) => setForm((f) => ({ ...f, rateAmd: e.target.value }))}
          />
        </DirectorField>
        <DirectorField label="Սկսում է">
          <DirectorInput
            type="date"
            value={form.effectiveFrom}
            onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
          />
        </DirectorField>
        <DirectorField label="Ավարտի ամսաթիվ">
          <DirectorInput
            type="date"
            value={form.effectiveTo}
            onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Թողեք դատարկ, եթե դրույքը դեռ գործում է։ Երբ փոխեք դրույքը, հինը կփակվի ավտոմատ։
          </p>
        </DirectorField>
        <DirectorField label="Մեկնաբանություն">
          <DirectorTextarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </DirectorField>
      </DirectorRecordFormDialog>
    </>
  );
}
