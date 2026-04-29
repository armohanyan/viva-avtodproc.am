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
import TableColumnFilter, { TableColumnHeaderWithFilter } from "src/components/TableColumnFilter";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Landmark, Plus, Edit2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { branchNameById, useBranches } from "src/modules/branches";
import type { CarExpense } from "src/modules/cars";
import { useFleetCars } from "src/modules/cars";
import {
  formatAmd,
  monthRange,
  outcomesBreakdownInRange,
  type FinanceTx,
  type TxChannel,
  type TxMethod,
} from "./adminFinanceShared";
import {
  FLEET_EXPENSE_PURPOSE_DROPDOWN_AM,
  FLEET_EXPENSE_PURPOSE_OTHER_AM,
  purposeFormFromStored,
  purposeFromPurposeForm,
} from "./fleetExpensePurposeAm";

export default function AdminFinanceOutcomes() {
  const addFormId = useId();
  const editFormId = useId();
  const { t } = useLang();
  const { showToast } = useToast();
  const { branches } = useBranches();
  const { cars, expenses, addExpense, updateExpense, removeExpense } = useFleetCars();
  const [search, setSearch] = useState("");
  const [manualSearch, setManualSearch] = useState("");
  const [carFilter, setCarFilter] = useState<string>("all");
  const [editRow, setEditRow] = useState<CarExpense | null>(null);
  const [newRow, setNewRow] = useState({
    carId: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    purposeChoice: "",
    purposeCustom: "",
    note: "",
  });
  const [editPurposeChoice, setEditPurposeChoice] = useState("");
  const [editPurposeCustom, setEditPurposeCustom] = useState("");
  const [manualExpenses, setManualExpenses] = useState<FinanceTx[]>([]);
  const [manualEditRow, setManualEditRow] = useState<FinanceTx | null>(null);
  const [manualEditForm, setManualEditForm] = useState({
    employeeName: "",
    description: "",
    branchId: "1",
    units: "",
    unitRateAmd: "",
    grossAmd: "",
    datetimeLocal: new Date().toISOString().slice(0, 16),
  });
  const [manualExpenseForm, setManualExpenseForm] = useState({
    employeeName: "",
    description: "",
    branchId: "1",
    channel: "office" as TxChannel,
    method: "cash" as TxMethod,
    units: "",
    unitRateAmd: "",
    grossAmd: "",
    datetimeLocal: new Date().toISOString().slice(0, 16),
  });

  const plateByCarId = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of cars) m.set(String(c.id), c.plate);
    return m;
  }, [cars]);

  const sorted = useMemo(() => {
    return [...expenses].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [expenses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter((e) => {
      const plate = plateByCarId.get(String(e.carId)) ?? String(e.carId);
      const hay = [plate, e.purpose, e.note ?? "", e.date].join(" ").toLowerCase();
      const matchQ = !q || hay.includes(q);
      const matchCar = carFilter === "all" || String(e.carId) === carFilter;
      return matchQ && matchCar;
    });
  }, [sorted, search, carFilter, plateByCarId]);

  const monthStats = useMemo(() => {
    const { start, end } = monthRange();
    const fleet = outcomesBreakdownInRange(expenses, start, end).reduce((s, r) => s + r.total, 0);
    const manual = manualExpenses
      .filter((tx) => tx.status === "completed")
      .filter((tx) => {
        const d = new Date(tx.createdAt);
        return d >= start && d <= end;
      })
      .reduce((sum, tx) => sum + tx.grossAmd, 0);
    return { fleet, manual, total: fleet + manual };
  }, [expenses, manualExpenses]);

  const manualFiltered = useMemo(() => {
    const q = manualSearch.trim().toLowerCase();
    return manualExpenses.filter((tx) => {
      const hay = [
        tx.id,
        tx.customer,
        tx.employeeName ?? "",
        tx.description,
        tx.expenseKind ?? "",
        tx.status,
        tx.unitRateAmd ?? "",
        tx.units ?? "",
        tx.grossAmd,
        branchNameById(branches, tx.branchId),
      ]
        .join(" ")
        .toLowerCase();
      return !q || hay.includes(q);
    });
  }, [manualExpenses, manualSearch, branches]);

  const refreshManualExpenses = useCallback(async () => {
    try {
      const rows = await vivaApiJson<FinanceTx[]>("/finance/transactions");
      const normalized = Array.isArray(rows) ? rows : [];
      setManualExpenses(normalized.filter((x) => (x.entryType ?? "income") === "expense"));
    } catch (e) {
      setManualExpenses([]);
      showToast(getApiErrorMessage(e), "error");
    }
  }, [showToast]);

  useEffect(() => {
    void refreshManualExpenses();
  }, [refreshManualExpenses]);

  useEffect(() => {
    if (!editRow) {
      setEditPurposeChoice("");
      setEditPurposeCustom("");
      return;
    }
    const { choice, custom } = purposeFormFromStored(editRow.purpose);
    setEditPurposeChoice(choice);
    setEditPurposeCustom(custom);
  }, [editRow?.id, editRow?.purpose]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRow.carId) {
      showToast(t("adminFinanceOutcomePickCar"), "error");
      return;
    }
    const amount = Number.parseFloat(newRow.amount.replace(",", "."));
    if (!newRow.purposeChoice || Number.isNaN(amount) || amount <= 0) {
      showToast(t("fillRequired"), "error");
      return;
    }
    if (newRow.purposeChoice === FLEET_EXPENSE_PURPOSE_OTHER_AM && !newRow.purposeCustom.trim()) {
      showToast(t("fillRequired"), "error");
      return;
    }
    const purpose = purposeFromPurposeForm(newRow.purposeChoice, newRow.purposeCustom);
    if (!purpose) {
      showToast(t("fillRequired"), "error");
      return;
    }
    await addExpense({
      carId: newRow.carId,
      amount: Math.round(amount),
      date: newRow.date.slice(0, 10),
      purpose,
      note: newRow.note.trim() || undefined,
    });
    setNewRow({
      carId: newRow.carId,
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      purposeChoice: "",
      purposeCustom: "",
      note: "",
    });
    showToast(t("fleetExpenseCreatedToast"), "success");
  };

  const saveEdit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!editRow) return;
    const amount = Number.parseFloat(String(editRow.amount).replace(",", "."));
    if (!editPurposeChoice || Number.isNaN(amount) || amount <= 0) {
      showToast(t("fillRequired"), "error");
      return;
    }
    if (editPurposeChoice === FLEET_EXPENSE_PURPOSE_OTHER_AM && !editPurposeCustom.trim()) {
      showToast(t("fillRequired"), "error");
      return;
    }
    const purpose = purposeFromPurposeForm(editPurposeChoice, editPurposeCustom);
    if (!purpose) {
      showToast(t("fillRequired"), "error");
      return;
    }
    await updateExpense(editRow.id, {
      amount: Math.round(amount),
      date: editRow.date.slice(0, 10),
      purpose,
      note: editRow.note?.trim() || undefined,
    });
    setEditRow(null);
    showToast(t("fleetExpenseSavedToast"), "success");
  };

  const handleDelete = useCallback(
    async (id: string) => {
      await removeExpense(id);
      showToast(t("fleetExpenseDeletedToast"), "success");
    },
    [removeExpense, showToast],
  );

  const submitManualExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const units = manualExpenseForm.units.trim() ? Number.parseFloat(manualExpenseForm.units.replace(",", ".")) : NaN;
    const unitRateAmd = manualExpenseForm.unitRateAmd.trim()
      ? Number.parseFloat(manualExpenseForm.unitRateAmd.replace(",", "."))
      : NaN;
    const fallbackGross = manualExpenseForm.grossAmd.trim()
      ? Number.parseFloat(manualExpenseForm.grossAmd.replace(",", "."))
      : NaN;
    const hasRateCalc = Number.isFinite(units) && Number.isFinite(unitRateAmd) && units > 0 && unitRateAmd > 0;
    const grossAmd = hasRateCalc ? Math.round(units * unitRateAmd) : Math.round(fallbackGross);
    if (!manualExpenseForm.description.trim() || !Number.isFinite(grossAmd) || grossAmd <= 0) {
      showToast(t("fillRequired"), "error");
      return;
    }
    try {
      await vivaApiJson("/finance/transactions", {
        method: "POST",
        body: {
          createdAt: new Date(manualExpenseForm.datetimeLocal).toISOString(),
          customer: manualExpenseForm.employeeName.trim() || t("financeDefaultOperatingExpenseCustomer"),
          email: "",
          description: manualExpenseForm.description.trim(),
          branchId: Number(manualExpenseForm.branchId) || 1,
          channel: manualExpenseForm.channel,
          method: manualExpenseForm.method,
          grossAmd,
          feeAmd: 0,
          status: "completed",
          providerRef: "—",
          source: "manual",
          entryType: "expense",
          expenseKind: hasRateCalc ? "hourly_rate" : "other",
          employeeName: manualExpenseForm.employeeName.trim() || null,
          ...(hasRateCalc ? { units, unitRateAmd: Math.round(unitRateAmd) } : {}),
        },
      });
      setManualExpenseForm({
        employeeName: "",
        description: "",
        branchId: manualExpenseForm.branchId,
        channel: "office",
        method: "cash",
        units: "",
        unitRateAmd: "",
        grossAmd: "",
        datetimeLocal: new Date().toISOString().slice(0, 16),
      });
      showToast(t("adminFinanceOutcomeSavedToast"), "success");
      await refreshManualExpenses();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    }
  };

  const startManualEdit = (tx: FinanceTx) => {
    setManualEditRow(tx);
    setManualEditForm({
      employeeName: tx.employeeName ?? "",
      description: tx.description,
      branchId: String(tx.branchId),
      units: tx.units != null ? String(tx.units) : "",
      unitRateAmd: tx.unitRateAmd != null ? String(tx.unitRateAmd) : "",
      grossAmd: String(tx.grossAmd),
      datetimeLocal: new Date(tx.createdAt).toISOString().slice(0, 16),
    });
  };

  const submitManualEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEditRow) return;
    const units = manualEditForm.units.trim() ? Number.parseFloat(manualEditForm.units.replace(",", ".")) : NaN;
    const unitRateAmd = manualEditForm.unitRateAmd.trim()
      ? Number.parseFloat(manualEditForm.unitRateAmd.replace(",", "."))
      : NaN;
    const grossAmdInput = manualEditForm.grossAmd.trim()
      ? Number.parseFloat(manualEditForm.grossAmd.replace(",", "."))
      : NaN;
    const hasRateCalc = Number.isFinite(units) && Number.isFinite(unitRateAmd) && units > 0 && unitRateAmd > 0;
    const grossAmd = hasRateCalc ? Math.round(units * unitRateAmd) : Math.round(grossAmdInput);
    if (!manualEditForm.description.trim() || !Number.isFinite(grossAmd) || grossAmd <= 0) {
      showToast(t("fillRequired"), "error");
      return;
    }
    try {
      await vivaApiJson(`/finance/transactions/${manualEditRow.id}`, {
        method: "PATCH",
        body: {
          createdAt: new Date(manualEditForm.datetimeLocal).toISOString(),
          customer: manualEditForm.employeeName.trim() || t("financeDefaultOperatingExpenseCustomer"),
          description: manualEditForm.description.trim(),
          branchId: Number(manualEditForm.branchId) || 1,
          grossAmd,
          expenseKind: hasRateCalc ? "hourly_rate" : "other",
          employeeName: manualEditForm.employeeName.trim() || null,
          units: hasRateCalc ? units : null,
          unitRateAmd: hasRateCalc ? Math.round(unitRateAmd) : null,
        },
      });
      setManualEditRow(null);
      showToast(t("fleetExpenseSavedToast"), "success");
      await refreshManualExpenses();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    }
  };

  const handleManualDelete = async (tx: FinanceTx) => {
    try {
      await vivaApiJson(`/finance/transactions/${tx.id}`, { method: "DELETE" });
      showToast(t("fleetExpenseDeletedToast"), "success");
      await refreshManualExpenses();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    }
  };

  return (
    <AdminLayout>
      <PanelPageHeader icon={Landmark} title={t("adminFinanceOutcomesTitle")} subtitle={t("adminFinanceOutcomesSubtitle")} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-5 border-border">
          <p className="text-xs text-muted-foreground mb-1">{t("adminFinanceOutcomeKpiFleet")}</p>
          <p className="text-lg font-bold tabular-nums">{formatAmd(monthStats.fleet)}</p>
        </Card>
        <Card className="p-5 border-border">
          <p className="text-xs text-muted-foreground mb-1">{t("adminFinanceOutcomeKpiManual")}</p>
          <p className="text-lg font-bold tabular-nums">{formatAmd(monthStats.manual)}</p>
        </Card>
        <Card className="p-5 border-border">
          <p className="text-xs text-muted-foreground mb-1">{t("adminFinanceOutcomeKpiTotal")}</p>
          <p className="text-lg font-bold tabular-nums">{formatAmd(monthStats.total)}</p>
        </Card>
      </div>

      <Card className="border-border overflow-hidden min-w-0 mb-8">
        <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="font-semibold text-foreground">{t("adminFinanceOutcomesFleetLedgerTitle")}</h3>
        </div>
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`}>
          <CsvExportButton
            filename="admin-finance-outcomes.csv"
            headers={[
              t("fleetExpenseColDate"),
              t("fleetColPlate"),
              t("fleetExpenseColPurpose"),
              t("fleetExpenseColAmount"),
              t("fleetExpenseColNote"),
            ]}
            rows={filtered.map((ex) => [
              ex.date,
              plateByCarId.get(String(ex.carId)) ?? String(ex.carId),
              ex.purpose,
              String(ex.amount),
              ex.note ?? "—",
            ])}
          />
        </DataTableToolbar>
        <AdminTableScroll>
          <table className="w-full text-sm min-w-[42rem]">
            <thead className="bg-muted/40">
              <tr>
                <TableColumnHeaderWithFilter title={t("fleetExpenseColDate")} />
                <TableColumnHeaderWithFilter
                  title={t("fleetColPlate")}
                  filter={
                    <TableColumnFilter
                      value={carFilter}
                      onChange={setCarFilter}
                      ariaLabel={t("filterByCar")}
                      options={[
                        { value: "all", label: t("filterOptionAll") },
                        ...cars.map((c) => ({ value: String(c.id), label: c.plate })),
                      ]}
                    />
                  }
                />
                <TableColumnHeaderWithFilter title={t("fleetExpenseColPurpose")} />
                <TableColumnHeaderWithFilter title={t("fleetExpenseColAmount")} />
                <TableColumnHeaderWithFilter title={t("fleetExpenseColNote")} />
                <TableColumnHeaderWithFilter title={t("actions")} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {t("tableNoMatches")}
                  </td>
                </tr>
              ) : (
                filtered.map((ex) => (
                  <AdminTableRowContextMenu
                    key={ex.id}
                    actions={[
                      { kind: "item", id: "edit", label: t("edit"), icon: Edit2, onClick: () => setEditRow({ ...ex }) },
                      {
                        kind: "item",
                        id: "delete",
                        label: t("delete"),
                        icon: Trash2,
                        destructive: true,
                        onClick: () => void handleDelete(ex.id),
                      },
                    ]}
                  >
                    <tr className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{ex.date}</td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{plateByCarId.get(String(ex.carId)) ?? ex.carId}</td>
                      <td className="px-4 py-3 max-w-[14rem]">{ex.purpose}</td>
                      <td className="px-4 py-3 font-medium tabular-nums whitespace-nowrap">{formatAmd(Math.abs(ex.amount))}</td>
                      <td className="px-4 py-3 text-muted-foreground text-sm max-w-[12rem] truncate" title={ex.note}>
                        {ex.note ?? "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <AdminTableRowActions
                          toolbarOnly
                          actions={[
                            { kind: "item", id: "edit", label: t("edit"), icon: Edit2, onClick: () => setEditRow({ ...ex }) },
                            {
                              kind: "item",
                              id: "delete",
                              label: t("delete"),
                              icon: Trash2,
                              destructive: true,
                              onClick: () => void handleDelete(ex.id),
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

      <Card className="p-5 sm:p-6 border-border border-dashed">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">{t("adminFinanceOutcomeAddTitle")}</h3>
        </div>
        <form id={addFormId} onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("fleetColPlate")} *</label>
            <select
              value={newRow.carId}
              onChange={(e) => setNewRow((r) => ({ ...r, carId: e.target.value }))}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
              required
            >
              <option value="">{t("adminFinanceOutcomePickCar")}</option>
              {cars.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.plate}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("fleetExpenseColAmount")} *</label>
            <Input
              inputMode="decimal"
              value={newRow.amount}
              onChange={(e) => setNewRow((r) => ({ ...r, amount: e.target.value }))}
              className="h-10"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("fleetExpenseColDate")} *</label>
            <Input type="date" value={newRow.date} onChange={(e) => setNewRow((r) => ({ ...r, date: e.target.value }))} className="h-10" />
          </div>
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("fleetExpenseColPurpose")} *</label>
            <select
              required
              value={newRow.purposeChoice}
              onChange={(e) => {
                const v = e.target.value;
                setNewRow((r) => ({
                  ...r,
                  purposeChoice: v,
                  purposeCustom: v === FLEET_EXPENSE_PURPOSE_OTHER_AM ? r.purposeCustom : "",
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
          </div>
          {newRow.purposeChoice === FLEET_EXPENSE_PURPOSE_OTHER_AM ? (
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-xs font-medium text-muted-foreground mb-1">{t("adminFinancePurposeOtherLabel")}</label>
              <Input
                value={newRow.purposeCustom}
                onChange={(e) => setNewRow((r) => ({ ...r, purposeCustom: e.target.value }))}
                className="h-10"
                placeholder={t("adminFinancePurposeOtherHint")}
              />
            </div>
          ) : null}
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("fleetExpenseColNote")}</label>
            <Input value={newRow.note} onChange={(e) => setNewRow((r) => ({ ...r, note: e.target.value }))} className="h-10" />
          </div>
          <div className="sm:col-span-2 flex items-end">
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
              {t("fleetAddExpense")}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="border-border overflow-hidden min-w-0 mt-6 mb-8">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-foreground">{t("adminFinanceOutcomesManualLedgerTitle")}</h3>
        </div>
        <DataTableToolbar value={manualSearch} onChange={setManualSearch} placeholder={`${t("search")}…`} />
        <AdminTableScroll>
          <table className="w-full text-sm min-w-[58rem]">
            <thead className="bg-muted/40">
              <tr>
                <TableColumnHeaderWithFilter title={t("tableColId")} />
                <TableColumnHeaderWithFilter title={t("financeColDateTime")} />
                <TableColumnHeaderWithFilter title={t("adminFinanceOutcomeEmployeeVendor")} />
                <TableColumnHeaderWithFilter title={t("financeColProduct")} />
                <TableColumnHeaderWithFilter title={t("adminColBranch")} />
                <TableColumnHeaderWithFilter title={t("adminFinanceOutcomeUnits")} />
                <TableColumnHeaderWithFilter title={t("adminFinanceOutcomeRateAmd")} />
                <TableColumnHeaderWithFilter title={t("fleetExpenseColAmount")} />
                <TableColumnHeaderWithFilter title={t("actions")} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {manualFiltered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {t("tableNoMatches")}
                  </td>
                </tr>
              ) : (
                manualFiltered.map((tx) => (
                  <AdminTableRowContextMenu
                    key={tx.id}
                    actions={[
                      { kind: "item", id: "edit", label: t("edit"), icon: Edit2, onClick: () => startManualEdit(tx) },
                      {
                        kind: "item",
                        id: "delete",
                        label: t("delete"),
                        icon: Trash2,
                        destructive: true,
                        onClick: () => void handleManualDelete(tx),
                      },
                    ]}
                  >
                    <tr className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{tx.id}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(tx.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-foreground">{tx.employeeName || tx.customer || "—"}</td>
                      <td className="px-4 py-3 max-w-[16rem]">{tx.description}</td>
                      <td className="px-4 py-3 text-muted-foreground">{branchNameById(branches, tx.branchId)}</td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">{tx.units ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">{tx.unitRateAmd != null ? formatAmd(tx.unitRateAmd) : "—"}</td>
                      <td className="px-4 py-3 font-medium tabular-nums">{formatAmd(tx.grossAmd)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <AdminTableRowActions
                          toolbarOnly
                          actions={[
                            { kind: "item", id: "edit", label: t("edit"), icon: Edit2, onClick: () => startManualEdit(tx) },
                            {
                              kind: "item",
                              id: "delete",
                              label: t("delete"),
                              icon: Trash2,
                              destructive: true,
                              onClick: () => void handleManualDelete(tx),
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

      <Card className="p-5 sm:p-6 border-border border-dashed mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">{t("adminFinanceOutcomeFormManualTitle")}</h3>
        </div>
        <form onSubmit={submitManualExpense} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("adminFinanceOutcomeEmployeeVendor")}</label>
            <Input value={manualExpenseForm.employeeName} onChange={(e) => setManualExpenseForm((r) => ({ ...r, employeeName: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("financeColProduct")} *</label>
            <Input value={manualExpenseForm.description} onChange={(e) => setManualExpenseForm((r) => ({ ...r, description: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("financeColDateTime")} *</label>
            <Input type="datetime-local" value={manualExpenseForm.datetimeLocal} onChange={(e) => setManualExpenseForm((r) => ({ ...r, datetimeLocal: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("adminFinanceOutcomeUnits")}</label>
            <Input value={manualExpenseForm.units} onChange={(e) => setManualExpenseForm((r) => ({ ...r, units: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("adminFinanceOutcomeRateAmd")}</label>
            <Input value={manualExpenseForm.unitRateAmd} onChange={(e) => setManualExpenseForm((r) => ({ ...r, unitRateAmd: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("fleetExpenseColAmount")} *</label>
            <Input value={manualExpenseForm.grossAmd} onChange={(e) => setManualExpenseForm((r) => ({ ...r, grossAmd: e.target.value }))} placeholder={t("adminFinanceOutcomeAmountHint")} />
          </div>
          <div className="sm:col-span-2 flex items-end">
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {t("adminFinanceOutcomeSaveExpense")}
            </Button>
          </div>
        </form>
      </Card>

      <AppModal
        open={!!editRow}
        onOpenChange={(o) => !o && setEditRow(null)}
        title={t("fleetEditExpense")}
        contentClassName="max-w-md"
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
        {editRow && (
          <form id={editFormId} onSubmit={saveEdit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("fleetExpenseColAmount")} *</label>
              <Input
                inputMode="decimal"
                value={Number.isFinite(editRow.amount) ? String(editRow.amount) : ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  const n = Number.parseFloat(raw.replace(",", "."));
                  setEditRow({ ...editRow, amount: raw.trim() === "" || Number.isNaN(n) ? 0 : n });
                }}
                className="h-10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("fleetExpenseColDate")} *</label>
              <Input type="date" value={editRow.date} onChange={(e) => setEditRow({ ...editRow, date: e.target.value })} className="h-10" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("fleetExpenseColPurpose")} *</label>
              <select
                required
                value={editPurposeChoice}
                onChange={(e) => {
                  const v = e.target.value;
                  setEditPurposeChoice(v);
                  if (v !== FLEET_EXPENSE_PURPOSE_OTHER_AM) setEditPurposeCustom("");
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
            </div>
            {editPurposeChoice === FLEET_EXPENSE_PURPOSE_OTHER_AM ? (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminFinancePurposeOtherLabel")}</label>
                <Input
                  value={editPurposeCustom}
                  onChange={(e) => setEditPurposeCustom(e.target.value)}
                  className="h-10"
                  placeholder={t("adminFinancePurposeOtherHint")}
                />
              </div>
            ) : null}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("fleetExpenseColNote")}</label>
              <Input value={editRow.note ?? ""} onChange={(e) => setEditRow({ ...editRow, note: e.target.value })} className="h-10" />
            </div>
            <p className="text-xs text-muted-foreground">{t("adminFinanceOutcomeFleetNote")}</p>
          </form>
        )}
      </AppModal>

      <AppModal
        open={!!manualEditRow}
        onOpenChange={(o) => !o && setManualEditRow(null)}
        title={t("edit")}
        contentClassName="max-w-md"
        footer={
          manualEditRow ? (
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setManualEditRow(null)}>
                {t("cancel")}
              </Button>
              <Button type="submit" form="manual-expense-edit-form" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                {t("save")}
              </Button>
            </div>
          ) : null
        }
      >
        {manualEditRow ? (
          <form id="manual-expense-edit-form" onSubmit={submitManualEdit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminFinanceOutcomeEmployeeVendor")}</label>
              <Input value={manualEditForm.employeeName} onChange={(e) => setManualEditForm((r) => ({ ...r, employeeName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("financeColProduct")} *</label>
              <Input value={manualEditForm.description} onChange={(e) => setManualEditForm((r) => ({ ...r, description: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("financeColDateTime")} *</label>
              <Input type="datetime-local" value={manualEditForm.datetimeLocal} onChange={(e) => setManualEditForm((r) => ({ ...r, datetimeLocal: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminColBranch")} *</label>
              <select
                value={manualEditForm.branchId}
                onChange={(e) => setManualEditForm((r) => ({ ...r, branchId: e.target.value }))}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
              >
                {branches.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminFinanceOutcomeUnits")}</label>
              <Input value={manualEditForm.units} onChange={(e) => setManualEditForm((r) => ({ ...r, units: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminFinanceOutcomeRateAmd")}</label>
              <Input value={manualEditForm.unitRateAmd} onChange={(e) => setManualEditForm((r) => ({ ...r, unitRateAmd: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("fleetExpenseColAmount")} *</label>
              <Input value={manualEditForm.grossAmd} onChange={(e) => setManualEditForm((r) => ({ ...r, grossAmd: e.target.value }))} />
            </div>
          </form>
        ) : null}
      </AppModal>
    </AdminLayout>
  );
}
