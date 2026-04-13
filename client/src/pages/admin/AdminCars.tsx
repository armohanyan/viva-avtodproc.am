import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import AdminTableRowActions, { AdminTableRowContextMenu } from "src/components/AdminTableRowActions";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "src/components/ui/dialog";
import ConfirmDialog from "src/components/ConfirmDialog";
import DataTableToolbar from "src/components/DataTableToolbar";
import CsvExportButton from "src/components/CsvExportButton";
import PanelPageHeader from "src/components/PanelPageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select";
import { Plus, Edit2, Trash2, CarFront, Receipt } from "lucide-react";
import { useMemo, useState } from "react";
import type { CarExpense, FleetCar } from "src/modules/cars";
import { useFleetCars } from "src/modules/cars";
import { useInstructors } from "src/modules/instructors/useInstructors";
import { cn } from "src/lib/utils";

function formatMoney(n: number) {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 0 })} ֏`;
}

function instructorNamesForEmails(emails: string[] | undefined, roster: readonly { email: string; name: string }[]) {
  if (!emails?.length) return "—";
  return emails.map((e) => roster.find((x) => x.email === e)?.name ?? e).join(", ");
}

function toggleEmail(list: string[], email: string) {
  return list.includes(email) ? list.filter((x) => x !== email) : [...list, email];
}

const PURPOSE_SUGGESTIONS = ["Insurance", "Repair", "Inspection", "Tires", "Fuel", "Cleaning", "Other"];

export default function AdminCars() {
  const { t } = useLang();
  const { showToast } = useToast();
  const { instructors } = useInstructors();
  const instructorRoster = useMemo(
    () => instructors.map((i) => ({ email: i.email, name: i.name })),
    [instructors],
  );
  const {
    cars,
    addCar,
    updateCar,
    removeCar,
    addExpense,
    updateExpense,
    removeExpense,
    expensesForCar,
    totalForCar,
    totalsAllTimeByCar,
  } = useFleetCars();

  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editCar, setEditCar] = useState<FleetCar | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newCar, setNewCar] = useState({
    plate: "",
    vin: "",
    make: "",
    model: "",
    year: "" as string,
    transmission: "" as "" | "manual" | "automatic",
    notes: "",
    assignedInstructorEmails: [] as string[],
  });

  const [expenseCar, setExpenseCar] = useState<FleetCar | null>(null);
  const [expenseMonth, setExpenseMonth] = useState<string>("");
  const [newExpense, setNewExpense] = useState({
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    purpose: "",
    note: "",
  });
  const [editExpense, setEditExpense] = useState<CarExpense | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cars.filter((c) => {
      const hay = [c.plate, c.vin, c.make, c.model, c.notes, c.year != null ? String(c.year) : ""]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return !q || hay.includes(q);
    });
  }, [cars, search]);

  const monthFilter = expenseMonth || null;

  const handleDeleteCar = () => {
    if (!deleteId) return;
    removeCar(deleteId);
    if (expenseCar?.id === deleteId) setExpenseCar(null);
    setDeleteId(null);
    showToast(t("fleetCarDeletedToast"), "success");
  };

  const handleSaveCar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCar) return;
    if (!editCar.plate.trim() || !editCar.make.trim() || !editCar.model.trim()) {
      showToast(t("fillRequired"), "error");
      return;
    }
    updateCar(editCar.id, {
      plate: editCar.plate.trim(),
      vin: editCar.vin?.trim() || undefined,
      make: editCar.make.trim(),
      model: editCar.model.trim(),
      year: editCar.year,
      transmission: editCar.transmission,
      notes: editCar.notes?.trim() || undefined,
      assignedInstructorEmails:
        editCar.assignedInstructorEmails && editCar.assignedInstructorEmails.length > 0
          ? editCar.assignedInstructorEmails
          : undefined,
    });
    setEditCar(null);
    if (expenseCar?.id === editCar.id) {
      setExpenseCar({
        ...expenseCar,
        plate: editCar.plate.trim(),
        vin: editCar.vin?.trim() || undefined,
        make: editCar.make.trim(),
        model: editCar.model.trim(),
        year: editCar.year,
        transmission: editCar.transmission,
        notes: editCar.notes?.trim() || undefined,
        assignedInstructorEmails: editCar.assignedInstructorEmails,
      });
    }
    showToast(t("fleetCarSavedToast"), "success");
  };

  const handleAddCar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCar.plate.trim() || !newCar.make.trim() || !newCar.model.trim()) {
      showToast(t("fillRequired"), "error");
      return;
    }
    const y = newCar.year.trim() ? parseInt(newCar.year, 10) : undefined;
    addCar({
      plate: newCar.plate.trim(),
      vin: newCar.vin.trim() || undefined,
      make: newCar.make.trim(),
      model: newCar.model.trim(),
      year: y != null && !Number.isNaN(y) ? y : undefined,
      transmission: newCar.transmission || undefined,
      notes: newCar.notes.trim() || undefined,
      assignedInstructorEmails:
        newCar.assignedInstructorEmails.length > 0 ? newCar.assignedInstructorEmails : undefined,
    });
    setAddOpen(false);
    setNewCar({
      plate: "",
      vin: "",
      make: "",
      model: "",
      year: "",
      transmission: "",
      notes: "",
      assignedInstructorEmails: [],
    });
    showToast(t("fleetCarCreatedToast"), "success");
  };

  const openExpenses = (c: FleetCar) => {
    setExpenseCar(c);
    setExpenseMonth("");
    setNewExpense({
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      purpose: "",
      note: "",
    });
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseCar) return;
    const amount = parseFloat(newExpense.amount.replace(",", "."));
    if (!newExpense.purpose.trim() || Number.isNaN(amount) || amount <= 0) {
      showToast(t("fillRequired"), "error");
      return;
    }
    addExpense({
      carId: expenseCar.id,
      amount,
      date: newExpense.date.slice(0, 10),
      purpose: newExpense.purpose.trim(),
      note: newExpense.note.trim() || undefined,
    });
    setNewExpense({
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      purpose: "",
      note: "",
    });
    showToast(t("fleetExpenseCreatedToast"), "success");
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editExpense) return;
    const amount = parseFloat(String(editExpense.amount).replace(",", "."));
    if (!editExpense.purpose.trim() || Number.isNaN(amount) || amount <= 0) {
      showToast(t("fillRequired"), "error");
      return;
    }
    updateExpense(editExpense.id, {
      amount,
      date: editExpense.date.slice(0, 10),
      purpose: editExpense.purpose.trim(),
      note: editExpense.note?.trim() || undefined,
    });
    setEditExpense(null);
    showToast(t("fleetExpenseSavedToast"), "success");
  };

  const listExpenses = expenseCar ? expensesForCar(expenseCar.id, monthFilter) : [];
  const filteredTotal = expenseCar ? totalForCar(expenseCar.id, monthFilter) : 0;
  const allTimeTotal = expenseCar ? totalsAllTimeByCar.get(expenseCar.id) ?? 0 : 0;

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={CarFront}
        title={t("adminSidebarCars")}
        subtitle={t("adminCarsPageSubtitle")}
        actions={
          <Button onClick={() => setAddOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            {t("fleetAddCar")}
          </Button>
        }
      />

      <div className="rounded-xl border border-border bg-card overflow-hidden min-w-0">
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`}>
          <CsvExportButton
            filename="admin-fleet.csv"
            headers={[
              t("fleetColPlate"),
              t("fleetFieldVin"),
              t("fleetColMake"),
              t("fleetColModel"),
              t("fleetColYear"),
              t("fleetColAssignedInstructors"),
              t("fleetColTotalSpent"),
            ]}
            rows={filtered.map((c) => [
              c.plate,
              c.vin ?? "—",
              c.make,
              c.model,
              c.year != null ? String(c.year) : "—",
              instructorNamesForEmails(c.assignedInstructorEmails, instructorRoster),
              formatMoney(totalsAllTimeByCar.get(c.id) ?? 0),
            ])}
          />
        </DataTableToolbar>
        <AdminTableScroll>
          <table className="w-full text-sm min-w-[48rem]">
            <thead className="bg-muted/40">
              <tr>
                {[
                  t("fleetColPlate"),
                  t("fleetFieldVin"),
                  t("fleetColMake"),
                  t("fleetColModel"),
                  t("fleetColYear"),
                  t("fleetColAssignedInstructors"),
                  t("fleetColTotalSpent"),
                  t("actions"),
                ].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c) => (
                <AdminTableRowContextMenu
                  key={c.id}
                  actions={[
                    {
                      kind: "item",
                      id: "expenses",
                      label: t("fleetOpenExpenses"),
                      ariaLabel: t("fleetOpenExpenses"),
                      icon: Receipt,
                      onClick: () => openExpenses(c),
                    },
                    {
                      kind: "item",
                      id: "edit",
                      label: t("edit"),
                      icon: Edit2,
                      onClick: () => setEditCar({ ...c }),
                    },
                    {
                      kind: "item",
                      id: "delete",
                      label: t("delete"),
                      icon: Trash2,
                      destructive: true,
                      onClick: () => setDeleteId(c.id),
                    },
                  ]}
                >
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-foreground whitespace-nowrap">{c.plate}</td>
                    <td className="px-4 py-3.5 text-muted-foreground font-mono text-xs whitespace-nowrap">{c.vin ?? "—"}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{c.make}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{c.model}</td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{c.year ?? "—"}</td>
                    <td
                      className="px-4 py-3.5 text-muted-foreground max-w-[14rem] truncate"
                      title={instructorNamesForEmails(c.assignedInstructorEmails, instructorRoster)}
                    >
                      {instructorNamesForEmails(c.assignedInstructorEmails, instructorRoster)}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-foreground whitespace-nowrap">
                      {formatMoney(totalsAllTimeByCar.get(c.id) ?? 0)}
                    </td>
                    <td className="px-4 py-3.5">
                      <AdminTableRowActions
                        toolbarOnly
                        actions={[
                          {
                            kind: "item",
                            id: "expenses",
                            label: t("fleetOpenExpenses"),
                            ariaLabel: t("fleetOpenExpenses"),
                            icon: Receipt,
                            onClick: () => openExpenses(c),
                          },
                          {
                            kind: "item",
                            id: "edit",
                            label: t("edit"),
                            icon: Edit2,
                            onClick: () => setEditCar({ ...c }),
                          },
                          {
                            kind: "item",
                            id: "delete",
                            label: t("delete"),
                            icon: Trash2,
                            destructive: true,
                            onClick: () => setDeleteId(c.id),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                </AdminTableRowContextMenu>
              ))}
            </tbody>
          </table>
        </AdminTableScroll>
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          {filtered.length} / {cars.length}
        </div>
      </div>

      <Dialog open={!!editCar} onOpenChange={() => setEditCar(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("fleetCarDialogEdit")}</DialogTitle>
          </DialogHeader>
          {editCar && (
            <form onSubmit={handleSaveCar} className="space-y-3 mt-2">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("fleetFieldPlate")} *</label>
                <Input
                  value={editCar.plate}
                  onChange={(e) => setEditCar({ ...editCar, plate: e.target.value })}
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("fleetFieldMake")} *</label>
                <Input
                  value={editCar.make}
                  onChange={(e) => setEditCar({ ...editCar, make: e.target.value })}
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("fleetFieldVin")}</label>
                <Input
                  value={editCar.vin ?? ""}
                  onChange={(e) => setEditCar({ ...editCar, vin: e.target.value })}
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("fleetFieldModel")} *</label>
                <Input
                  value={editCar.model}
                  onChange={(e) => setEditCar({ ...editCar, model: e.target.value })}
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("fleetFieldYear")}</label>
                <Input
                  type="number"
                  min={1990}
                  max={2100}
                  value={editCar.year ?? ""}
                  onChange={(e) =>
                    setEditCar({
                      ...editCar,
                      year: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("fleetFieldTransmission")}</label>
                <Select
                  value={editCar.transmission ?? "none"}
                  onValueChange={(v) =>
                    setEditCar({
                      ...editCar,
                      transmission: v === "none" ? undefined : (v as "manual" | "automatic"),
                    })
                  }
                >
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder={t("fleetTransmissionAny")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("fleetTransmissionAny")}</SelectItem>
                    <SelectItem value="manual">{t("transmissionManual")}</SelectItem>
                    <SelectItem value="automatic">{t("transmissionAutomatic")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("fleetFieldNotes")}</label>
                <Input
                  value={editCar.notes ?? ""}
                  onChange={(e) => setEditCar({ ...editCar, notes: e.target.value })}
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">{t("fleetFieldAssignInstructors")}</label>
                <div className="rounded-md border border-border p-3 space-y-2 max-h-44 overflow-y-auto">
                  {instructorRoster.map((ins) => {
                    const checked = (editCar.assignedInstructorEmails ?? []).includes(ins.email);
                    return (
                      <label key={ins.email} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setEditCar({
                              ...editCar,
                              assignedInstructorEmails: toggleEmail(editCar.assignedInstructorEmails ?? [], ins.email),
                            })
                          }
                          className="rounded border-input"
                        />
                        <span className="min-w-0">{ins.name}</span>
                        <span className="text-xs text-muted-foreground truncate">({ins.email})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditCar(null)}>
                  {t("cancel")}
                </Button>
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                  {t("save")}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("fleetCarDialogNew")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCar} className="space-y-3 mt-2">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("fleetFieldPlate")} *</label>
              <Input
                value={newCar.plate}
                onChange={(e) => setNewCar({ ...newCar, plate: e.target.value })}
                className="h-10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("fleetFieldMake")} *</label>
              <Input
                value={newCar.make}
                onChange={(e) => setNewCar({ ...newCar, make: e.target.value })}
                className="h-10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("fleetFieldVin")}</label>
              <Input
                value={newCar.vin}
                onChange={(e) => setNewCar({ ...newCar, vin: e.target.value })}
                className="h-10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("fleetFieldModel")} *</label>
              <Input
                value={newCar.model}
                onChange={(e) => setNewCar({ ...newCar, model: e.target.value })}
                className="h-10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("fleetFieldYear")}</label>
              <Input
                type="number"
                min={1990}
                max={2100}
                value={newCar.year}
                onChange={(e) => setNewCar({ ...newCar, year: e.target.value })}
                className="h-10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("fleetFieldTransmission")}</label>
              <Select
                value={newCar.transmission || "none"}
                onValueChange={(v) =>
                  setNewCar({
                    ...newCar,
                    transmission: v === "none" ? "" : (v as "manual" | "automatic"),
                  })
                }
              >
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder={t("fleetTransmissionAny")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("fleetTransmissionAny")}</SelectItem>
                  <SelectItem value="manual">{t("transmissionManual")}</SelectItem>
                  <SelectItem value="automatic">{t("transmissionAutomatic")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("fleetFieldNotes")}</label>
              <Input value={newCar.notes} onChange={(e) => setNewCar({ ...newCar, notes: e.target.value })} className="h-10" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">{t("fleetFieldAssignInstructors")}</label>
              <div className="rounded-md border border-border p-3 space-y-2 max-h-44 overflow-y-auto">
                {instructorRoster.map((ins) => {
                  const checked = newCar.assignedInstructorEmails.includes(ins.email);
                  return (
                    <label key={ins.email} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setNewCar({
                            ...newCar,
                            assignedInstructorEmails: toggleEmail(newCar.assignedInstructorEmails, ins.email),
                          })
                        }
                        className="rounded border-input"
                      />
                      <span className="min-w-0">{ins.name}</span>
                      <span className="text-xs text-muted-foreground truncate">({ins.email})</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                {t("addNew")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!expenseCar} onOpenChange={(o) => !o && setExpenseCar(null)}>
        <DialogContent
          showCloseButton
          className={cn(
            "gap-0 p-0 overflow-hidden flex flex-col",
            /* Wider than default Dialog sm:max-w-lg; nearly full width on phones */
            "w-[calc(100vw-0.75rem)] max-w-[calc(100vw-0.75rem)]",
            "sm:max-w-5xl md:max-w-6xl lg:max-w-7xl xl:max-w-[90rem]",
            "max-h-[90dvh] h-[90dvh] sm:h-auto sm:max-h-[min(90dvh,920px)]"
          )}
        >
          <div className="shrink-0 px-4 pt-5 pb-3 sm:px-6 sm:pt-6 border-b border-border/60 bg-muted/15">
            <DialogHeader className="text-left space-y-1">
              <DialogTitle className="flex flex-col sm:flex-row sm:items-start gap-2 pr-10 text-base sm:text-lg leading-snug">
                <span className="inline-flex items-center gap-2 min-w-0">
                  <Receipt className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  {expenseCar ? (
                    <span className="break-words">
                      {t("fleetExpensesDialogTitle")}: <span className="font-semibold">{expenseCar.plate}</span>
                      <span className="text-muted-foreground font-normal text-sm block sm:inline sm:ml-1">
                        ({expenseCar.make} {expenseCar.model})
                      </span>
                    </span>
                  ) : null}
                </span>
              </DialogTitle>
            </DialogHeader>
          </div>

          {expenseCar && (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0 px-4 py-4 sm:px-6 sm:py-5 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                  <div className="flex-1 min-w-0 sm:min-w-[220px]">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">{t("fleetMonthFilterLabel")}</label>
                    <Input
                      type="month"
                      value={expenseMonth}
                      onChange={(e) => setExpenseMonth(e.target.value)}
                      className="h-11 w-full max-w-full sm:max-w-[240px]"
                    />
                  </div>
                  {expenseMonth ? (
                    <Button type="button" variant="outline" size="default" className="w-full sm:w-auto shrink-0 h-11" onClick={() => setExpenseMonth("")}>
                      {t("fleetMonthFilterClear")}
                    </Button>
                  ) : null}
                  {expenseCar ? (
                    <CsvExportButton
                      className="w-full sm:w-auto"
                      filename={`fleet-expenses-${expenseCar.plate.replace(/[^\w.-]+/g, "_")}.csv`}
                      headers={[
                        t("fleetExpenseColDate"),
                        t("fleetExpenseColAmount"),
                        t("fleetExpenseColPurpose"),
                        t("fleetExpenseColNote"),
                      ]}
                      rows={listExpenses.map((ex) => [
                        ex.date,
                        formatMoney(ex.amount),
                        ex.purpose,
                        ex.note ?? "—",
                      ])}
                    />
                  ) : null}
                </div>

                <div className="rounded-xl border border-border bg-muted/20 px-4 py-4 sm:px-5 space-y-1">
                  <div className="text-sm text-muted-foreground">{monthFilter ? t("fleetTotalThisMonth") : t("fleetTotalLabel")}</div>
                  <div className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums break-all">{formatMoney(filteredTotal)}</div>
                  {monthFilter ? (
                    <div className="text-xs sm:text-sm text-muted-foreground pt-1">
                      {t("fleetTotalAllTimeLabel")}: {formatMoney(allTimeTotal)}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-xl border border-border overflow-hidden min-h-0">
                  <div className="max-h-[min(38vh,420px)] sm:max-h-[min(48vh,520px)] lg:max-h-[min(52vh,560px)] overflow-y-auto overscroll-y-contain">
                    <AdminTableScroll>
                    <table className="w-full min-w-[640px] text-sm">
                      <thead className="bg-muted/40 sticky top-0 z-[1] shadow-[0_1px_0_0_hsl(var(--border))]">
                        <tr>
                          {[t("fleetExpenseColDate"), t("fleetExpenseColAmount"), t("fleetExpenseColPurpose"), t("fleetExpenseColNote"), t("actions")].map(
                            (h) => (
                              <th
                                key={h}
                                className="text-left text-xs font-semibold text-muted-foreground px-3 sm:px-4 py-3 uppercase tracking-wider whitespace-nowrap"
                              >
                                {h}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {listExpenses.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-3 sm:px-4 py-10 text-center text-muted-foreground text-sm">
                              {t("fleetExpenseEmpty")}
                            </td>
                          </tr>
                        ) : (
                          listExpenses.map((ex) => (
                            <AdminTableRowContextMenu
                              key={ex.id}
                              actions={[
                                {
                                  kind: "item",
                                  id: "edit",
                                  label: t("edit"),
                                  icon: Edit2,
                                  onClick: () => setEditExpense({ ...ex }),
                                },
                                {
                                  kind: "item",
                                  id: "delete",
                                  label: t("delete"),
                                  icon: Trash2,
                                  destructive: true,
                                  onClick: () => {
                                    removeExpense(ex.id);
                                    showToast(t("fleetExpenseDeletedToast"), "success");
                                  },
                                },
                              ]}
                            >
                              <tr className="hover:bg-muted/30">
                                <td className="px-3 sm:px-4 py-2.5 whitespace-nowrap text-muted-foreground align-top">{ex.date}</td>
                                <td className="px-3 sm:px-4 py-2.5 font-medium tabular-nums align-top whitespace-nowrap">{formatMoney(ex.amount)}</td>
                                <td className="px-3 sm:px-4 py-2.5 align-top min-w-[140px] max-w-[280px]">{ex.purpose}</td>
                                <td className="px-3 sm:px-4 py-2.5 text-muted-foreground align-top min-w-[120px] max-w-[220px] break-words" title={ex.note}>
                                  {ex.note ?? "—"}
                                </td>
                                <td className="px-3 sm:px-4 py-2.5 align-top whitespace-nowrap">
                                  <AdminTableRowActions
                                    toolbarOnly
                                    className="gap-1"
                                    actions={[
                                      {
                                        kind: "item",
                                        id: "edit",
                                        label: t("edit"),
                                        icon: Edit2,
                                        onClick: () => setEditExpense({ ...ex }),
                                      },
                                      {
                                        kind: "item",
                                        id: "delete",
                                        label: t("delete"),
                                        icon: Trash2,
                                        destructive: true,
                                        onClick: () => {
                                          removeExpense(ex.id);
                                          showToast(t("fleetExpenseDeletedToast"), "success");
                                        },
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
                  </div>
                </div>

                <form
                  onSubmit={handleAddExpense}
                  className="rounded-xl border border-dashed border-border p-4 sm:p-5 space-y-4 bg-card/60"
                >
                  <div className="text-sm font-semibold text-foreground">{t("fleetExpenseFormTitle")}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="sm:col-span-1 lg:col-span-1">
                      <label className="block text-xs font-medium text-muted-foreground mb-1">{t("fleetExpenseColAmount")} *</label>
                      <Input
                        inputMode="decimal"
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                        placeholder="0"
                        className="h-11"
                      />
                    </div>
                    <div className="sm:col-span-1 lg:col-span-1">
                      <label className="block text-xs font-medium text-muted-foreground mb-1">{t("fleetExpenseColDate")} *</label>
                      <Input
                        type="date"
                        value={newExpense.date}
                        onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                        className="h-11 min-w-0 w-full"
                      />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-2">
                      <label className="block text-xs font-medium text-muted-foreground mb-1">{t("fleetExpenseColPurpose")} *</label>
                      <Input
                        list="fleet-purpose-suggestions"
                        value={newExpense.purpose}
                        onChange={(e) => setNewExpense({ ...newExpense, purpose: e.target.value })}
                        placeholder={t("fleetExpensePurposePlaceholder")}
                        className="h-11 w-full min-w-0"
                      />
                      <datalist id="fleet-purpose-suggestions">
                        {PURPOSE_SUGGESTIONS.map((p) => (
                          <option key={p} value={p} />
                        ))}
                      </datalist>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-4">
                      <label className="block text-xs font-medium text-muted-foreground mb-1">{t("fleetExpenseColNote")}</label>
                      <Input
                        value={newExpense.note}
                        onChange={(e) => setNewExpense({ ...newExpense, note: e.target.value })}
                        className="h-11 w-full min-w-0"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full sm:w-auto min-h-11 px-8 bg-primary hover:bg-primary/90 text-primary-foreground">
                    {t("fleetAddExpense")}
                  </Button>
                </form>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editExpense} onOpenChange={() => setEditExpense(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("fleetEditExpense")}</DialogTitle>
          </DialogHeader>
          {editExpense && (
            <form onSubmit={handleSaveExpense} className="space-y-3 mt-2">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("fleetExpenseColAmount")} *</label>
                <Input
                  inputMode="decimal"
                  value={Number.isFinite(editExpense.amount) ? String(editExpense.amount) : ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const n = parseFloat(raw.replace(",", "."));
                    setEditExpense({
                      ...editExpense,
                      amount: raw.trim() === "" || Number.isNaN(n) ? 0 : n,
                    });
                  }}
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("fleetExpenseColDate")} *</label>
                <Input
                  type="date"
                  value={editExpense.date}
                  onChange={(e) => setEditExpense({ ...editExpense, date: e.target.value })}
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("fleetExpenseColPurpose")} *</label>
                <Input
                  value={editExpense.purpose}
                  onChange={(e) => setEditExpense({ ...editExpense, purpose: e.target.value })}
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("fleetExpenseColNote")}</label>
                <Input
                  value={editExpense.note ?? ""}
                  onChange={(e) => setEditExpense({ ...editExpense, note: e.target.value })}
                  className="h-10"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditExpense(null)}>
                  {t("cancel")}
                </Button>
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                  {t("save")}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteCar}
        title={t("fleetCarDeleteConfirmTitle")}
        description={t("fleetCarDeleteConfirmDesc")}
        confirmLabel={t("delete")}
        danger
      />
    </AdminLayout>
  );
}
