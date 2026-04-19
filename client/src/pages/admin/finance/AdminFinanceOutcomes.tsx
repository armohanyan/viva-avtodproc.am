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
import { useCallback, useId, useMemo, useState } from "react";
import { useToast } from "src/lib/toast";
import type { CarExpense } from "src/modules/cars";
import { useFleetCars } from "src/modules/cars";
import {
  type TxChannel,
  type TxMethod,
  channelTKey,
  formatAmd,
  methodTKey,
  monthRange,
  outcomesBreakdownInRange,
} from "./adminFinanceShared";

function normChannel(c: CarExpense["channel"]): TxChannel {
  if (c === "online" || c === "pos" || c === "bank") return c;
  return "office";
}

function normMethod(m: CarExpense["method"]): TxMethod {
  if (m === "card" || m === "idram" || m === "transfer") return m;
  return "cash";
}

export default function AdminFinanceOutcomes() {
  const addFormId = useId();
  const editFormId = useId();
  const { t } = useLang();
  const { showToast } = useToast();
  const { cars, expenses, addExpense, updateExpense, removeExpense } = useFleetCars();
  const [search, setSearch] = useState("");
  const [carFilter, setCarFilter] = useState<string>("all");
  const [editRow, setEditRow] = useState<CarExpense | null>(null);
  const [newRow, setNewRow] = useState({
    carId: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    purpose: "",
    note: "",
    channel: "office" as TxChannel,
    method: "cash" as TxMethod,
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
      const ch = normChannel(e.channel);
      const me = normMethod(e.method);
      const hay = [plate, e.purpose, e.note ?? "", e.date, t(channelTKey(ch)), t(methodTKey(me))].join(" ").toLowerCase();
      const matchQ = !q || hay.includes(q);
      const matchCar = carFilter === "all" || String(e.carId) === carFilter;
      return matchQ && matchCar;
    });
  }, [sorted, search, carFilter, plateByCarId, t]);

  const breakdownRows = useMemo(() => {
    const { start, end } = monthRange();
    return outcomesBreakdownInRange(expenses, start, end);
  }, [expenses]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRow.carId) {
      showToast(t("adminFinanceOutcomePickCar"), "error");
      return;
    }
    const amount = Number.parseFloat(newRow.amount.replace(",", "."));
    if (!newRow.purpose.trim() || Number.isNaN(amount) || amount <= 0) {
      showToast(t("fillRequired"), "error");
      return;
    }
    await addExpense({
      carId: newRow.carId,
      amount,
      date: newRow.date.slice(0, 10),
      purpose: newRow.purpose.trim(),
      note: newRow.note.trim() || undefined,
      channel: newRow.channel,
      method: newRow.method,
    });
    setNewRow({
      carId: newRow.carId,
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      purpose: "",
      note: "",
      channel: "office",
      method: "cash",
    });
    showToast(t("fleetExpenseCreatedToast"), "success");
  };

  const saveEdit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!editRow) return;
    const amount = Number.parseFloat(String(editRow.amount).replace(",", "."));
    if (!editRow.purpose.trim() || Number.isNaN(amount) || amount <= 0) {
      showToast(t("fillRequired"), "error");
      return;
    }
    await updateExpense(editRow.id, {
      amount,
      date: editRow.date.slice(0, 10),
      purpose: editRow.purpose.trim(),
      note: editRow.note?.trim() || undefined,
      channel: normChannel(editRow.channel),
      method: normMethod(editRow.method),
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

  return (
    <AdminLayout>
      <PanelPageHeader icon={Landmark} title={t("adminFinanceOutcomesTitle")} subtitle={t("adminFinanceOutcomesSubtitle")} />

      <div className="mb-8">
        <h3 className="text-sm font-semibold text-foreground mb-3">{t("adminFinanceBreakdownOutcomesDetailTitle")}</h3>
        {breakdownRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("adminFinanceBreakdownEmpty")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {breakdownRows.map((row) => (
              <Card key={row.key} className="p-4 border-border">
                <p className="text-xs text-muted-foreground mb-1">
                  {t(channelTKey(row.channel))} · {t(methodTKey(row.method))}
                </p>
                <p className="text-lg font-bold text-foreground tabular-nums">{formatAmd(row.total)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {row.count} {row.count === 1 ? t("adminFinanceBreakdownTxSingular") : t("adminFinanceBreakdownTxPlural")}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card className="border-border overflow-hidden min-w-0 mb-8">
        <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="font-semibold text-foreground">{t("adminFinanceOutcomesLedgerTitle")}</h3>
        </div>
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`}>
          <CsvExportButton
            filename="admin-finance-outcomes.csv"
            headers={[
              t("fleetExpenseColDate"),
              t("fleetColPlate"),
              t("fleetExpenseColPurpose"),
              t("financeColChannel"),
              t("financeColMethod"),
              t("fleetExpenseColAmount"),
              t("fleetExpenseColNote"),
            ]}
            rows={filtered.map((ex) => [
              ex.date,
              plateByCarId.get(String(ex.carId)) ?? String(ex.carId),
              ex.purpose,
              t(channelTKey(normChannel(ex.channel))),
              t(methodTKey(normMethod(ex.method))),
              String(ex.amount),
              ex.note ?? "—",
            ])}
          />
        </DataTableToolbar>
        <AdminTableScroll>
          <table className="w-full text-sm min-w-[56rem]">
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
                <TableColumnHeaderWithFilter title={t("financeColChannel")} />
                <TableColumnHeaderWithFilter title={t("financeColMethod")} />
                <TableColumnHeaderWithFilter title={t("fleetExpenseColAmount")} />
                <TableColumnHeaderWithFilter title={t("fleetExpenseColNote")} />
                <TableColumnHeaderWithFilter title={t("actions")} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
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
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{t(channelTKey(normChannel(ex.channel)))}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{t(methodTKey(normMethod(ex.method)))}</td>
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
        <form id={addFormId} onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
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
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("financeColChannel")}</label>
            <select
              value={newRow.channel}
              onChange={(e) => setNewRow((r) => ({ ...r, channel: e.target.value as TxChannel }))}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="office">{t("financeChannelOffice")}</option>
              <option value="pos">{t("financeChannelPos")}</option>
              <option value="online">{t("financeChannelOnline")}</option>
              <option value="bank">{t("financeChannelBank")}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("financeColMethod")}</label>
            <select
              value={newRow.method}
              onChange={(e) => setNewRow((r) => ({ ...r, method: e.target.value as TxMethod }))}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="cash">{t("financeMethodCash")}</option>
              <option value="card">{t("financeMethodCard")}</option>
              <option value="transfer">{t("financeMethodTransfer")}</option>
              <option value="idram">{t("financeMethodIdram")}</option>
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("fleetExpenseColPurpose")} *</label>
            <Input value={newRow.purpose} onChange={(e) => setNewRow((r) => ({ ...r, purpose: e.target.value }))} className="h-10" />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
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
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("financeColChannel")}</label>
              <select
                value={normChannel(editRow.channel)}
                onChange={(e) => setEditRow({ ...editRow, channel: e.target.value as TxChannel })}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="office">{t("financeChannelOffice")}</option>
                <option value="pos">{t("financeChannelPos")}</option>
                <option value="online">{t("financeChannelOnline")}</option>
                <option value="bank">{t("financeChannelBank")}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("financeColMethod")}</label>
              <select
                value={normMethod(editRow.method)}
                onChange={(e) => setEditRow({ ...editRow, method: e.target.value as TxMethod })}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="cash">{t("financeMethodCash")}</option>
                <option value="card">{t("financeMethodCard")}</option>
                <option value="transfer">{t("financeMethodTransfer")}</option>
                <option value="idram">{t("financeMethodIdram")}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("fleetExpenseColPurpose")} *</label>
              <Input value={editRow.purpose} onChange={(e) => setEditRow({ ...editRow, purpose: e.target.value })} className="h-10" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("fleetExpenseColNote")}</label>
              <Input value={editRow.note ?? ""} onChange={(e) => setEditRow({ ...editRow, note: e.target.value })} className="h-10" />
            </div>
            <p className="text-xs text-muted-foreground">{t("adminFinanceOutcomeFleetNote")}</p>
          </form>
        )}
      </AppModal>
    </AdminLayout>
  );
}
