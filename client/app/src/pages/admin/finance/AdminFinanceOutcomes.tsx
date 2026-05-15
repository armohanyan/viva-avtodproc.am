import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import AdminTableRowActions, { AdminTableRowContextMenu } from "src/components/AdminTableRowActions";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Input } from "src/components/ui/input";
import { Button } from "src/components/ui/button";
import { AppModal } from "src/components/AppModal";
import DataTableToolbar from "src/components/DataTableToolbar";
import CsvExportButton from "src/components/CsvExportButton";
import { TableColumnHeaderWithFilter } from "src/components/TableColumnFilter";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Landmark, Plus, Edit2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useBranches } from "src/modules/branches";
import { useFleetCars } from "src/modules/cars";
import { useInstructors } from "src/modules/instructors/useInstructors";
import type { AdminExpensePurpose, AdminFinanceExpense, CreateAdminFinanceExpenseBody } from "src/types/admin-finance-expense.types";
import { formatAmd, monthRange } from "./adminFinanceShared";
import {
  FLEET_EXPENSE_PURPOSE_DROPDOWN_AM,
  FLEET_EXPENSE_PURPOSE_OTHER_AM,
  purposeFormFromStored,
  purposeFromPurposeForm,
} from "./fleetExpensePurposeAm";
import { EXPENSE_ENTITY_OTHER_AM, EXPENSE_PURPOSE_OPTIONS } from "./expensePurposeAm";

const todayIso = () => new Date().toISOString().slice(0, 10);

type ExpenseFormState = {
  title: string;
  amount: string;
  date: string;
  purpose: AdminExpensePurpose | "";
  carId: string;
  carSubtype: string;
  carSubtypeCustom: string;
  branchId: string;
  branchCustom: string;
  instructorId: string;
  instructorCustom: string;
  customPurposeText: string;
  notes: string;
};

function emptyForm(): ExpenseFormState {
  return {
    title: "",
    amount: "",
    date: todayIso(),
    purpose: "",
    carId: "",
    carSubtype: "",
    carSubtypeCustom: "",
    branchId: "",
    branchCustom: "",
    instructorId: "",
    instructorCustom: "",
    customPurposeText: "",
    notes: "",
  };
}

function formFromExpense(row: AdminFinanceExpense): ExpenseFormState {
  const base: ExpenseFormState = {
    title: row.title,
    amount: String(row.amount),
    date: row.date.slice(0, 10),
    purpose: row.purpose,
    carId: "",
    carSubtype: "",
    carSubtypeCustom: "",
    branchId: "",
    branchCustom: "",
    instructorId: "",
    instructorCustom: "",
    customPurposeText: row.customPurposeText ?? "",
    notes: row.notes ?? "",
  };
  if (row.purpose === "car" && row.relatedEntityId) {
    base.carId = row.relatedEntityId;
    if (row.expenseSubtype === FLEET_EXPENSE_PURPOSE_OTHER_AM) {
      base.carSubtype = FLEET_EXPENSE_PURPOSE_OTHER_AM;
      base.carSubtypeCustom = row.customPurposeText ?? "";
    } else if (row.expenseSubtype) {
      base.carSubtype = row.expenseSubtype;
    } else {
      const { choice, custom } = purposeFormFromStored(row.title);
      base.carSubtype = choice;
      base.carSubtypeCustom = custom;
    }
  }
  if (row.purpose === "branch_rent") {
    if (row.relatedEntityId && row.relatedEntityId !== EXPENSE_ENTITY_OTHER_AM) {
      base.branchId = row.relatedEntityId;
    } else {
      base.branchId = EXPENSE_ENTITY_OTHER_AM;
      base.branchCustom = row.customPurposeText ?? row.relatedEntityLabel ?? "";
    }
  }
  if (row.purpose === "salary") {
    if (row.relatedEntityId && row.relatedEntityId !== EXPENSE_ENTITY_OTHER_AM) {
      base.instructorId = row.relatedEntityId;
    } else {
      base.instructorId = EXPENSE_ENTITY_OTHER_AM;
      base.instructorCustom = row.customPurposeText ?? row.relatedEntityLabel ?? "";
    }
  }
  if (row.purpose === "other") {
    base.customPurposeText = row.customPurposeText ?? "";
  }
  return base;
}

function buildCreateBody(form: ExpenseFormState): CreateAdminFinanceExpenseBody | null {
  const title = form.title.trim();
  const amount = Math.round(Number.parseFloat(form.amount.replace(",", ".")));
  const date = form.date.slice(0, 10);
  const purpose = form.purpose;
  const notes = form.notes.trim() || null;

  if (!title || !purpose || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const base: CreateAdminFinanceExpenseBody = { title, amount, date, purpose, notes };

  if (purpose === "car") {
    if (!form.carId) return null;
    if (!form.carSubtype) return null;
    if (form.carSubtype === FLEET_EXPENSE_PURPOSE_OTHER_AM && !form.carSubtypeCustom.trim()) return null;
    const purposeText = purposeFromPurposeForm(form.carSubtype, form.carSubtypeCustom);
    if (!purposeText) return null;
    return {
      ...base,
      relatedEntityType: "car",
      relatedEntityId: form.carId,
      expenseSubtype: form.carSubtype,
      customPurposeText: form.carSubtype === FLEET_EXPENSE_PURPOSE_OTHER_AM ? form.carSubtypeCustom.trim() : null,
    };
  }

  if (purpose === "branch_rent") {
    if (!form.branchId) return null;
    if (form.branchId === EXPENSE_ENTITY_OTHER_AM && !form.branchCustom.trim()) return null;
    return {
      ...base,
      relatedEntityType: "branch",
      relatedEntityId: form.branchId,
      customPurposeText: form.branchId === EXPENSE_ENTITY_OTHER_AM ? form.branchCustom.trim() : null,
    };
  }

  if (purpose === "salary") {
    if (!form.instructorId) return null;
    if (form.instructorId === EXPENSE_ENTITY_OTHER_AM && !form.instructorCustom.trim()) return null;
    return {
      ...base,
      relatedEntityType: "instructor",
      relatedEntityId: form.instructorId,
      customPurposeText: form.instructorId === EXPENSE_ENTITY_OTHER_AM ? form.instructorCustom.trim() : null,
    };
  }

  if (!form.customPurposeText.trim()) return null;
  return { ...base, customPurposeText: form.customPurposeText.trim() };
}

function relatedDisplay(row: AdminFinanceExpense): string {
  if (row.relatedEntityLabel?.trim()) return row.relatedEntityLabel;
  if (row.purpose === "other" && row.customPurposeText?.trim()) return row.customPurposeText;
  return "—";
}

function purposeTypeDisplay(row: AdminFinanceExpense): string {
  if (row.purpose === "car" && row.expenseSubtype) {
    if (row.expenseSubtype === FLEET_EXPENSE_PURPOSE_OTHER_AM && row.customPurposeText) {
      return `${row.purposeLabel} Â· ${row.customPurposeText}`;
    }
    return `${row.purposeLabel} Â· ${row.expenseSubtype}`;
  }
  return row.purposeLabel;
}

export default function AdminFinanceOutcomes() {
  const addFormId = useId();
  const editFormId = useId();
  const { t } = useLang();
  const { showToast } = useToast();
  const { branches } = useBranches();
  const { cars } = useFleetCars();
  const { instructors } = useInstructors();

  const [search, setSearch] = useState("");
  const [expenses, setExpenses] = useState<AdminFinanceExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<ExpenseFormState>(emptyForm);
  const [editRow, setEditRow] = useState<AdminFinanceExpense | null>(null);
  const [editForm, setEditForm] = useState<ExpenseFormState>(emptyForm);

  const refreshExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await vivaApiJson<AdminFinanceExpense[]>("/admin/finance/expenses");
      setExpenses(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setExpenses([]);
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void refreshExpenses();
  }, [refreshExpenses]);

  useEffect(() => {
    if (!editRow) return;
    setEditForm(formFromExpense(editRow));
  }, [editRow?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((row) => {
      const hay = [
        row.title,
        row.purposeLabel,
        row.expenseSubtype ?? "",
        row.customPurposeText ?? "",
        row.relatedEntityLabel ?? "",
        row.notes ?? "",
        row.createdByAdminName ?? "",
        row.date,
        String(row.amount),
      ]
        .join(" ")
        .toLowerCase();
      return !q || hay.includes(q);
    });
  }, [expenses, search]);

  const monthTotal = useMemo(() => {
    const { start, end } = monthRange();
    return expenses
      .filter((row) => {
        const d = new Date(`${row.date}T12:00:00`);
        return d >= start && d <= end;
      })
      .reduce((s, row) => s + row.amount, 0);
  }, [expenses]);

  const activeInstructors = useMemo(
    () => instructors.filter((i) => i.status === "active"),
    [instructors],
  );

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = buildCreateBody(addForm);
    if (!body) {
      showToast(t("fillRequired"), "error");
      return;
    }
    try {
      await vivaApiJson("/admin/finance/expenses", { method: "POST", body });
      setAddOpen(false);
      setAddForm(emptyForm());
      showToast(t("adminFinanceOutcomeSavedToast"), "success");
      await refreshExpenses();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRow) return;
    const body = buildCreateBody(editForm);
    if (!body) {
      showToast(t("fillRequired"), "error");
      return;
    }
    try {
      await vivaApiJson(`/admin/finance/expenses/${encodeURIComponent(editRow.id)}`, {
        method: "PATCH",
        body,
      });
      setEditRow(null);
      showToast(t("fleetExpenseSavedToast"), "success");
      await refreshExpenses();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    }
  };

  const handleDelete = useCallback(
    async (row: AdminFinanceExpense) => {
      try {
        await vivaApiJson(`/admin/finance/expenses/${encodeURIComponent(row.id)}`, { method: "DELETE" });
        showToast(t("fleetExpenseDeletedToast"), "success");
        await refreshExpenses();
      } catch (err) {
        showToast(getApiErrorMessage(err), "error");
      }
    },
    [refreshExpenses, showToast, t],
  );

  const renderConditionalFields = (form: ExpenseFormState, setForm: (updater: (prev: ExpenseFormState) => ExpenseFormState) => void) => {
    if (form.purpose === "car") {
      return (
        <>
          <FormField label={`${t("fleetColPlate")} *`}>
            <select
              required
              value={form.carId}
              onChange={(e) => setForm((f) => ({ ...f, carId: e.target.value }))}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">{t("adminFinanceOutcomePickCar")}</option>
              {cars.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.plate}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={`${t("adminFinanceExpenseSubtypeLabel")} *`}>
            <select
              required
              value={form.carSubtype}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({
                  ...f,
                  carSubtype: v,
                  carSubtypeCustom: v === FLEET_EXPENSE_PURPOSE_OTHER_AM ? f.carSubtypeCustom : "",
                }));
              }}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">{t("adminFinancePurposePick")}</option>
              {FLEET_EXPENSE_PURPOSE_DROPDOWN_AM.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
          {form.carSubtype === FLEET_EXPENSE_PURPOSE_OTHER_AM ? (
            <FormField label={`${t("adminFinancePurposeOtherLabel")} *`} className="sm:col-span-2">
              <Input
                value={form.carSubtypeCustom}
                onChange={(e) => setForm((f) => ({ ...f, carSubtypeCustom: e.target.value }))}
                className="h-10"
                placeholder={t("adminFinancePurposeOtherHint")}
              />
            </FormField>
          ) : null}
        </>
      );
    }

    if (form.purpose === "branch_rent") {
      return (
        <FormField label={`${t("adminColBranch")} *`} className="sm:col-span-2">
          <select
            required
            value={form.branchId}
            onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
            className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">{t("financeSelectBranchPlaceholder")}</option>
            {branches.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.name}
              </option>
            ))}
            <option value={EXPENSE_ENTITY_OTHER_AM}>{EXPENSE_ENTITY_OTHER_AM}</option>
          </select>
          {form.branchId === EXPENSE_ENTITY_OTHER_AM ? (
            <Input
              className="h-10 mt-2"
              value={form.branchCustom}
              onChange={(e) => setForm((f) => ({ ...f, branchCustom: e.target.value }))}
              placeholder={t("adminFinanceExpenseBranchOtherHint")}
            />
          ) : null}
        </FormField>
      );
    }

    if (form.purpose === "salary") {
      return (
        <FormField label={`${t("adminFinanceExpenseInstructorLabel")} *`} className="sm:col-span-2">
          <select
            required
            value={form.instructorId}
            onChange={(e) => setForm((f) => ({ ...f, instructorId: e.target.value }))}
            className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">{t("adminFinanceExpensePickInstructor")}</option>
            {activeInstructors.map((ins) => (
              <option key={ins.id} value={String(ins.id)}>
                {ins.name}
              </option>
            ))}
            <option value={EXPENSE_ENTITY_OTHER_AM}>{EXPENSE_ENTITY_OTHER_AM}</option>
          </select>
          {form.instructorId === EXPENSE_ENTITY_OTHER_AM ? (
            <Input
              className="h-10 mt-2"
              value={form.instructorCustom}
              onChange={(e) => setForm((f) => ({ ...f, instructorCustom: e.target.value }))}
              placeholder={t("adminFinanceExpenseInstructorOtherHint")}
            />
          ) : null}
        </FormField>
      );
    }

    if (form.purpose === "other") {
      return (
        <FormField label={`${t("adminFinanceExpenseCustomPurposeLabel")} *`} className="sm:col-span-2">
          <Input
            value={form.customPurposeText}
            onChange={(e) => setForm((f) => ({ ...f, customPurposeText: e.target.value }))}
            className="h-10"
            placeholder={t("adminFinanceExpenseCustomPurposeHint")}
          />
        </FormField>
      );
    }

    return null;
  };

  const renderExpenseForm = (
    formId: string,
    form: ExpenseFormState,
    setForm: (updater: (prev: ExpenseFormState) => ExpenseFormState) => void,
    onSubmit: (e: React.FormEvent) => void,
  ) => (
    <form id={formId} onSubmit={onSubmit} className="space-y-3">
      <FormField label={`${t("adminFinanceExpenseColTitle")} *`}>
        <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="h-10" />
      </FormField>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label={`${t("fleetExpenseColAmount")} *`}>
          <Input
            inputMode="decimal"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            className="h-10"
            placeholder="0"
          />
        </FormField>
        <FormField label={`${t("fleetExpenseColDate")} *`}>
          <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="h-10" />
        </FormField>
      </div>
      <FormField label={`${t("adminFinanceExpenseColPurposeType")} *`}>
        <select
          required
          value={form.purpose}
          onChange={(e) => {
            const purpose = e.target.value as AdminExpensePurpose | "";
            setForm(() => ({ ...emptyForm(), title: form.title, amount: form.amount, date: form.date, notes: form.notes, purpose }));
          }}
          className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">{t("adminFinanceExpensePickPurpose")}</option>
          {EXPENSE_PURPOSE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </FormField>
      <FormField className="sm:col-span-2">{renderConditionalFields(form, setForm)}</FormField>
      <FormField label={t("fleetExpenseColNote")}>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={3}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[4.5rem]"
        />
      </FormField>
    </form>
  );

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={Landmark}
        title={t("adminFinanceOutcomesTitle")}
        subtitle={t("adminFinanceOutcomesUnifiedSubtitle")}
        actions={
          <Button
            onClick={() => {
              setAddForm(emptyForm());
              setAddOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            <Plus className="w-4 h-4" />
            {t("adminFinanceOutcomeAddTitle")}
          </Button>
        }
      />

      <Card className="p-5 border-border mb-8">
        <p className="text-xs text-muted-foreground mb-1">{t("adminFinanceOutcomeKpiTotal")}</p>
        <p className="text-lg font-bold tabular-nums">{formatAmd(monthTotal)}</p>
      </Card>

      <Card className="border-border overflow-hidden min-w-0">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-foreground">{t("adminFinanceOutcomesLedgerTitle")}</h3>
        </div>
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`}>
          <CsvExportButton
            filename="admin-finance-expenses.csv"
            headers={[
              t("adminFinanceExpenseColTitle"),
              t("adminFinanceExpenseColPurposeType"),
              t("fleetExpenseColAmount"),
              t("fleetExpenseColDate"),
              t("adminFinanceExpenseColRelated"),
              t("fleetExpenseColNote"),
              t("adminFinanceExpenseColCreatedBy"),
            ]}
            rows={filtered.map((row) => [
              row.title,
              purposeTypeDisplay(row),
              String(row.amount),
              row.date,
              relatedDisplay(row),
              row.notes ?? "—",
              row.createdByAdminName ?? "—",
            ])}
          />
        </DataTableToolbar>
        <AdminTableScroll>
          <table className="w-full text-sm min-w-[56rem]">
            <thead className="bg-muted/40">
              <tr>
                <TableColumnHeaderWithFilter title={t("adminFinanceExpenseColTitle")} />
                <TableColumnHeaderWithFilter title={t("adminFinanceExpenseColPurposeType")} />
                <TableColumnHeaderWithFilter title={t("fleetExpenseColAmount")} />
                <TableColumnHeaderWithFilter title={t("fleetExpenseColDate")} />
                <TableColumnHeaderWithFilter title={t("adminFinanceExpenseColRelated")} />
                <TableColumnHeaderWithFilter title={t("fleetExpenseColNote")} />
                <TableColumnHeaderWithFilter title={t("adminFinanceExpenseColCreatedBy")} />
                <TableColumnHeaderWithFilter title={t("actions")} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {t("redirecting")}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {t("tableNoMatches")}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <AdminTableRowContextMenu
                    key={row.id}
                    actions={[
                      { kind: "item", id: "edit", label: t("edit"), icon: Edit2, onClick: () => setEditRow(row) },
                      {
                        kind: "item",
                        id: "delete",
                        label: t("delete"),
                        icon: Trash2,
                        destructive: true,
                        onClick: () => void handleDelete(row),
                      },
                    ]}
                  >
                    <tr className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium max-w-[14rem]">{row.title}</td>
                      <td className="px-4 py-3 max-w-[16rem] text-muted-foreground">{purposeTypeDisplay(row)}</td>
                      <td className="px-4 py-3 font-medium tabular-nums whitespace-nowrap">{formatAmd(row.amount)}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{row.date}</td>
                      <td className="px-4 py-3 max-w-[14rem]">{relatedDisplay(row)}</td>
                      <td className="px-4 py-3 text-muted-foreground text-sm max-w-[12rem] truncate" title={row.notes ?? undefined}>
                        {row.notes ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{row.createdByAdminName ?? "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <AdminTableRowActions
                          toolbarOnly
                          actions={[
                            { kind: "item", id: "edit", label: t("edit"), icon: Edit2, onClick: () => setEditRow(row) },
                            {
                              kind: "item",
                              id: "delete",
                              label: t("delete"),
                              icon: Trash2,
                              destructive: true,
                              onClick: () => void handleDelete(row),
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
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          {t("panelShowingLabel")} {filtered.length} / {expenses.length}
        </div>
      </Card>

      <AppModal
        open={addOpen}
        onOpenChange={(o) => !o && setAddOpen(false)}
        title={t("adminFinanceOutcomeAddTitle")}
        contentClassName="max-w-lg"
        footer={
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" form={addFormId} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
              {t("save")}
            </Button>
          </div>
        }
      >
        {renderExpenseForm(addFormId, addForm, setAddForm, submitAdd)}
      </AppModal>

      <AppModal
        open={!!editRow}
        onOpenChange={(o) => !o && setEditRow(null)}
        title={t("fleetEditExpense")}
        contentClassName="max-w-lg"
        footer={
          editRow ? (
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditRow(null)}>
                {t("cancel")}
              </Button>
              <Button type="submit" form={editFormId} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                {t("save")}
              </Button>
            </div>
          ) : null
        }
      >
        {editRow ? renderExpenseForm(editFormId, editForm, setEditForm, submitEdit) : null}
      </AppModal>
    </AdminLayout>
  );
}

function FormField({
  label,
  children,
  className,
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label ? <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label> : null}
      {children}
    </div>
  );
}

