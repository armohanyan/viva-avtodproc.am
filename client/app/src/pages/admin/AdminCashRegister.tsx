import AdminLayout from "src/components/AdminLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { AppModal } from "src/components/AppModal";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import AdminTableScroll from "src/components/AdminTableScroll";
import DataTableToolbar from "src/components/DataTableToolbar";
import { useAccount } from "src/modules/accounts";
import {
  getAdminBranchFilterId,
  setAdminBranchFilterId,
} from "src/modules/admin/adminBranchFilter";
import { useOptionalAdminBranchFilterRevision } from "src/modules/admin/AdminBranchFilterProvider";
import { branchOptionLabel } from "src/modules/branches";
import { useBranches } from "src/modules/branches/useBranches";
import { cityNameById, useCities } from "src/modules/cities";
import CashRegisterShiftView from "src/modules/cash-register/CashRegisterShiftView";
import CashRegisterFilters from "src/modules/cash-register/CashRegisterFilters";
import CashRegisterDayLedger from "src/modules/cash-register/CashRegisterDayLedger";
import CashRegisterPeriodPanel from "src/modules/cash-register/CashRegisterPeriodPanel";
import { printCashRegisterPeriodReport } from "src/modules/cash-register/cashRegisterPrint";
import type { CashRegisterAdminOption } from "src/modules/cash-register/CashRegisterFilters";
import {
  closeCashRegisterShift,
  createCashRegisterEntry,
  deleteCashRegisterEntry,
  fetchCashRegisterKassa,
  fetchCashRegisterPeriodSummary,
  fetchCashRegisterShift,
  fetchCashRegisterShifts,
  openCashRegisterShift,
  updateCashRegisterEntry,
} from "src/modules/cash-register/cash-register.api";
import type { DirectorCashSummary } from "src/modules/director/director.types";
import type { DirectorCashViewBy } from "src/modules/director/director.consts";
import type {
  CashRegisterPeriodSummary,
  CashShiftDetail,
  CashShiftLine,
  CashShiftSummary,
} from "src/modules/cash-register/cash-register.types";
import { todayIso } from "src/modules/director/director.consts";
import {
  DIRECTOR_CASH_DIRECTION_LABELS,
} from "src/modules/director/director.consts";
import type { DirectorCashDirection } from "src/modules/director/director.types";
import {
  directorAmd,
  directorOptionalComment,
} from "src/modules/director/directorFormValues";
import { formatAmd } from "src/pages/admin/finance/adminFinanceShared";
import { formatDateTime } from "src/lib/adminFormat";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { Wallet, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { cn } from "src/lib/utils";

type EntryForm = {
  direction: DirectorCashDirection;
  amount: string;
  comment: string;
};

function emptyEntryForm(): EntryForm {
  return { direction: "in", amount: "", comment: "" };
}

export default function AdminCashRegisterPage() {
  const { user } = useAccount();
  const { showToast } = useToast();
  const { branches } = useBranches();
  const { cities } = useCities();
  const branchFilterRevision = useOptionalAdminBranchFilterRevision();
  const isSuperAdmin = user?.accountType === "super_admin";

  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(todayIso);
  const [shifts, setShifts] = useState<CashShiftSummary[]>([]);
  const [activeDetail, setActiveDetail] = useState<CashShiftDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [entryModal, setEntryModal] = useState(false);
  const [openBranchId, setOpenBranchId] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [actualBalance, setActualBalance] = useState("");
  const [entryForm, setEntryForm] = useState<EntryForm>(emptyEntryForm);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [historySearch, setHistorySearch] = useState("");
  const [periodSummary, setPeriodSummary] = useState<CashRegisterPeriodSummary | null>(null);
  const [kassa, setKassa] = useState<DirectorCashSummary | null>(null);
  const [viewBy, setViewBy] = useState<DirectorCashViewBy>("branch");
  const [filterAdminUserId, setFilterAdminUserId] = useState<string | null>(null);
  const [admins, setAdmins] = useState<CashRegisterAdminOption[]>([]);
  /** Keeps a closed shift visible after «Փակել գրաֆիկ» until another shift is opened or selected. */
  const [focusedShiftId, setFocusedShiftId] = useState<number | null>(null);

  const filterBranchId = getAdminBranchFilterId();

  const kassaQueryParams = useMemo(
    () => ({
      startDate,
      endDate,
      branchId: viewBy === "branch" ? filterBranchId : null,
      adminUserId: viewBy === "admin" ? filterAdminUserId : null,
    }),
    [startDate, endDate, viewBy, filterBranchId, filterAdminUserId],
  );

  const canQuery =
    isSuperAdmin ||
    (viewBy === "admin" ? filterAdminUserId != null : filterBranchId != null);
  const shiftBranchSelected = filterBranchId != null;

  const openShiftForBranch = useMemo(
    () =>
      filterBranchId != null
        ? shifts.find((s) => s.status === "OPEN" && String(s.branchId) === filterBranchId)
        : null,
    [shifts, filterBranchId],
  );

  useEffect(() => {
    if (isSuperAdmin || filterBranchId != null || branches.length === 0) return;
    setAdminBranchFilterId(String(branches[0]!.id));
  }, [isSuperAdmin, filterBranchId, branches]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await vivaApiJson<Array<{ id: number | string; name?: string; email?: string }>>(
          "/accounts?roles=admin,super_admin",
        );
        if (cancelled) return;
        const next = (Array.isArray(data) ? data : [])
          .map((a) => {
            const id = String(a.id ?? "").trim();
            if (!id) return null;
            const name = String(a.name ?? "").trim() || String(a.email ?? "").trim() || `Admin #${id}`;
            return { id, name };
          })
          .filter((a): a is CashRegisterAdminOption => a != null)
          .sort((a, b) => a.name.localeCompare(b.name, "hy"));
        setAdmins(next);
      } catch {
        if (!cancelled) setAdmins([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onViewByChange = (next: DirectorCashViewBy) => {
    setViewBy(next);
    if (next === "admin") {
      setFilterAdminUserId((prev) => prev ?? (user?.id ? String(user.id) : null));
    } else {
      setFilterAdminUserId(null);
    }
  };

  const onBranchFilterChange = (value: string | null) => {
    setAdminBranchFilterId(value);
    setFocusedShiftId(null);
  };

  const resolveShiftDetailId = useCallback(
    (list: CashShiftSummary[], open: CashShiftSummary | undefined): number | null => {
      if (open) return open.id;
      if (
        focusedShiftId != null &&
        list.some((s) => s.id === focusedShiftId && String(s.branchId) === filterBranchId)
      ) {
        return focusedShiftId;
      }
      if (filterBranchId == null) return null;
      const forBranch = list
        .filter((s) => String(s.branchId) === filterBranchId)
        .sort((a, b) => Date.parse(b.openedAt) - Date.parse(a.openedAt));
      return forBranch[0]?.id ?? null;
    },
    [filterBranchId, focusedShiftId],
  );

  const loadShiftDetail = useCallback(async (id: number) => {
    setFocusedShiftId(id);
    setActiveDetail(await fetchCashRegisterShift(id));
  }, []);

  const reload = useCallback(async () => {
    if (!canQuery) {
      setShifts([]);
      setActiveDetail(null);
      setPeriodSummary(null);
      setKassa(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [list, period, kassaData] = await Promise.all([
        fetchCashRegisterShifts(startDate, endDate, filterBranchId),
        fetchCashRegisterPeriodSummary(kassaQueryParams),
        fetchCashRegisterKassa(kassaQueryParams),
      ]);
      setShifts(list);
      setPeriodSummary(period);
      setKassa(kassaData);
      const open =
        filterBranchId != null
          ? list.find((s) => s.status === "OPEN" && String(s.branchId) === filterBranchId)
          : undefined;
      const detailId = resolveShiftDetailId(list, open);
      if (detailId != null) {
        setActiveDetail(await fetchCashRegisterShift(detailId));
        if (open) setFocusedShiftId(open.id);
      } else {
        setActiveDetail(null);
      }
    } catch (e) {
      setShifts([]);
      setActiveDetail(null);
      setPeriodSummary(null);
      setKassa(null);
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [kassaQueryParams, filterBranchId, canQuery, showToast, resolveShiftDetailId, startDate, endDate]);

  useEffect(() => {
    void reload();
  }, [reload, branchFilterRevision]);

  const branchScopeLabel = useMemo(() => {
    if (!filterBranchId) return "Բոլորը";
    const branch = branches.find((b) => String(b.id) === filterBranchId);
    return branch ? branchOptionLabel(branch, cityNameById(cities, branch.cityId)) : filterBranchId;
  }, [filterBranchId, branches, cities]);

  const printedByName = user?.name?.trim() || user?.email?.trim() || undefined;

  const kassaRangeLabel =
    startDate === endDate ? startDate : `${startDate} — ${endDate}`;

  const filteredShifts = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return shifts;
    return shifts.filter((s) => {
      const hay = [s.branchName, s.adminName, s.status, String(s.id), formatAmd(s.expectedBalance)]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [shifts, historySearch]);

  const expectedForClose = activeDetail?.shift.expectedBalance ?? 0;
  const parsedActual = directorAmd(actualBalance);
  const closeDiff = Number.isFinite(parsedActual) ? parsedActual - expectedForClose : null;

  const submitOpen = async () => {
    const branchId = Number(openBranchId);
    const balance = directorAmd(openingBalance);
    if (!(branchId > 0)) {
      showToast("Ընտրեք մասնաճյուղ", "error");
      return;
    }
    if (balance < 0) {
      showToast("Սկզբնական մնացորդը պետք է լինի ոչ բացասական", "error");
      return;
    }
    try {
      const detail = await openCashRegisterShift({ branchId, openingBalance: balance });
      setOpenModal(false);
      setOpeningBalance("");
      showToast("Գրաֆիկը բացված է", "success");
      setFocusedShiftId(detail.shift.id);
      setActiveDetail(detail);
      void reload();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const submitClose = async () => {
    if (!activeDetail) return;
    try {
      const detail = await closeCashRegisterShift(activeDetail.shift.id, directorAmd(actualBalance));
      setCloseModal(false);
      setActualBalance("");
      setFocusedShiftId(detail.shift.id);
      setActiveDetail(detail);
      showToast("Գրաֆիկը փակված է", "success");
      void reload();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const submitEntry = async () => {
    if (!activeDetail) return;
    const amount = directorAmd(entryForm.amount);
    if (amount <= 0) {
      showToast("Գումարը պետք է լինի դրական", "error");
      return;
    }
    const body = {
      direction: entryForm.direction,
      amount,
      comment: directorOptionalComment(entryForm.comment),
    };
    try {
      const detail =
        editingEntryId != null
          ? await updateCashRegisterEntry(activeDetail.shift.id, editingEntryId, body)
          : await createCashRegisterEntry(activeDetail.shift.id, body);
      setEntryModal(false);
      setEntryForm(emptyEntryForm());
      setEditingEntryId(null);
      setActiveDetail(detail);
      showToast(editingEntryId != null ? "Թարմացված է" : "Գրանցված է", "success");
      void reload();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const onEditEntry = (line: CashShiftLine) => {
    setEditingEntryId(line.sourceId);
    setEntryForm({
      direction: line.direction,
      amount: String(line.amount),
      comment: line.comment ?? "",
    });
    setEntryModal(true);
  };

  const onDeleteEntry = async (line: CashShiftLine) => {
    if (!activeDetail) return;
    try {
      await deleteCashRegisterEntry(activeDetail.shift.id, line.sourceId);
      setActiveDetail(await fetchCashRegisterShift(activeDetail.shift.id));
      showToast("Ջնջված է", "success");
      void reload();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const openOpenModal = () => {
    setOpenBranchId(filterBranchId ?? (branches[0]?.id ? String(branches[0].id) : ""));
    setOpeningBalance("");
    setOpenModal(true);
  };

  return (
    <AdminLayout>
      <PanelPageHeader icon={Wallet} title="Դրամարկղ" subtitle="Կանխիկ մուտքեր, ելքեր և գրաֆիկ" />

      <CashRegisterFilters
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        viewBy={viewBy}
        onViewByChange={onViewByChange}
        branchId={filterBranchId}
        onBranchIdChange={onBranchFilterChange}
        adminUserId={filterAdminUserId}
        onAdminUserIdChange={setFilterAdminUserId}
        adminOptions={admins}
        showAllBranchesOption={isSuperAdmin}
        onApply={() => void reload()}
      />

      {!canQuery ? (
        <Card className="p-4 mb-6 text-sm text-muted-foreground">
          {viewBy === "admin"
            ? "Ընտրեք ադմին՝ տվյալները տեսնելու համար։"
            : "Ընտրեք մասնաճյուղ՝ տվյալները տեսնելու համար։"}
        </Card>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground mb-6">Բեռնվում է…</p>
      ) : kassa && periodSummary ? (
        <>
          <CashRegisterDayLedger kassa={kassa} rangeLabel={kassaRangeLabel} />
          <CashRegisterPeriodPanel
            summary={periodSummary}
            startDate={startDate}
            endDate={endDate}
            branchScope={branchScopeLabel}
            printedBy={printedByName}
            shifts={shifts}
          />
        </>
      ) : null}

      {shiftBranchSelected ? (
        <section className="mb-10">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold">
              {activeDetail?.shift.status === "CLOSED" ? "Փակված գրաֆիկ" : "Բաց գրաֆիկ"}
            </h2>
            <div className="flex flex-wrap gap-2 ms-auto">
              {!openShiftForBranch ? (
                <Button type="button" onClick={openOpenModal}>
                  Բացել գրաֆիկ
                </Button>
              ) : null}
              {activeDetail?.shift.status === "OPEN" ? (
                <>
                  <Button type="button" variant="secondary" onClick={() => setCloseModal(true)}>
                    Փակել գրաֆիկ
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setEditingEntryId(null);
                      setEntryForm(emptyEntryForm());
                      setEntryModal(true);
                    }}
                  >
                    <Plus className="h-4 w-4 me-1" />
                    Նոր գրառում
                  </Button>
                </>
              ) : null}
            </div>
          </div>
          {loading ? null : activeDetail ? (
            <CashRegisterShiftView
              detail={activeDetail}
              printedBy={printedByName}
              onEditEntry={activeDetail.shift.status === "OPEN" ? onEditEntry : undefined}
              onDeleteEntry={
                activeDetail.shift.status === "OPEN"
                  ? (line) => void onDeleteEntry(line)
                  : undefined
              }
              onPrintDailyResults={
                periodSummary
                  ? () =>
                      printCashRegisterPeriodReport({
                        startDate,
                        endDate,
                        branchScope: branchScopeLabel,
                        printedBy: printedByName,
                        period: periodSummary,
                        shifts,
                      })
                  : undefined
              }
            />
          ) : (
            <Card className="p-6 text-center text-muted-foreground">
              Այս մասնաճյուղում բաց գրաֆիկ չկա։ Սեղմեք «Բացել գրաֆիկ»։
            </Card>
          )}
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="text-lg font-semibold mb-3">Գրաֆիկների պատմություն</h2>
        <Card className="overflow-hidden">
          <DataTableToolbar
            value={historySearch}
            onChange={setHistorySearch}
            placeholder="Որոնել գրաֆիկ…"
          />
          <AdminTableScroll>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="p-3 font-medium">Մասնաճյուղ</th>
                  <th className="p-3 font-medium">Ադմին</th>
                  <th className="p-3 font-medium">Բացված</th>
                  <th className="p-3 font-medium">Կարգավիճակ</th>
                  <th className="p-3 font-medium text-end">Հաշվարկային</th>
                  <th className="p-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filteredShifts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      Գրաֆիկներ չկան
                    </td>
                  </tr>
                ) : (
                  filteredShifts.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">{s.branchName}</td>
                      <td className="p-3">{s.adminName}</td>
                      <td className="p-3 whitespace-nowrap">{formatDateTime(s.openedAt)}</td>
                      <td className="p-3">
                        <Badge variant={s.status === "OPEN" ? "default" : "secondary"}>
                          {s.status === "OPEN" ? "Բաց" : "Փակ"}
                        </Badge>
                      </td>
                      <td className="p-3 text-end tabular-nums">{formatAmd(s.expectedBalance)}</td>
                      <td className="p-3 text-end">
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => void loadShiftDetail(s.id)}
                        >
                          Դիտել
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </AdminTableScroll>
        </Card>
      </section>

      <AppModal
        open={openModal}
        onOpenChange={setOpenModal}
        title="Բացել գրաֆիկ"
        description="Սկզբնական կանխիկ մնացորդը դրամարկղում"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Չեղարկել
            </Button>
            <Button onClick={() => void submitOpen()}>Բացել</Button>
          </div>
        }
      >
        <div className="space-y-4 p-1">
          <div className="space-y-1">
            <Label>Մասնաճյուղ</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={openBranchId}
              onChange={(e) => setOpenBranchId(e.target.value)}
            >
              <option value="">—</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.label || b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Սկզբնական մնացորդ (֏)</Label>
            <Input
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              inputMode="numeric"
              placeholder="0"
            />
          </div>
        </div>
      </AppModal>

      <AppModal
        open={closeModal}
        onOpenChange={setCloseModal}
        title="Փակել գրաֆիկ"
        description="Մուտքագրեք դրամարկղում հաշվված փաստացի կանխիկը"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCloseModal(false)}>
              Չեղարկել
            </Button>
            <Button onClick={() => void submitClose()}>Փակել</Button>
          </div>
        }
      >
        <div className="space-y-4 p-1">
          <p className="text-sm">
            Հաշվարկային մնացորդ՝{" "}
            <span className="font-semibold tabular-nums">{formatAmd(expectedForClose)}</span>
          </p>
          <div className="space-y-1">
            <Label>Փաստացի մնացորդ (֏)</Label>
            <Input
              value={actualBalance}
              onChange={(e) => setActualBalance(e.target.value)}
              inputMode="numeric"
            />
          </div>
          {closeDiff != null ? (
            <p
              className={cn(
                "text-sm font-medium tabular-nums",
                closeDiff === 0
                  ? "text-muted-foreground"
                  : closeDiff > 0
                    ? "text-emerald-700"
                    : "text-rose-700",
              )}
            >
              Տարբերություն՝{" "}
              {closeDiff === 0
                ? formatAmd(0)
                : closeDiff > 0
                  ? `+${formatAmd(closeDiff)}`
                  : `−${formatAmd(Math.abs(closeDiff))}`}
            </p>
          ) : null}
        </div>
      </AppModal>

      <AppModal
        open={entryModal}
        onOpenChange={setEntryModal}
        title={editingEntryId != null ? "Խմբագրել գրառում" : "Նոր գրառում"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEntryModal(false)}>
              Չեղարկել
            </Button>
            <Button onClick={() => void submitEntry()}>
              {editingEntryId != null ? "Պահպանել" : "Գրանցել"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 p-1">
          <div className="space-y-1">
            <Label>Ուղղություն</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={entryForm.direction}
              onChange={(e) =>
                setEntryForm((f) => ({ ...f, direction: e.target.value as DirectorCashDirection }))
              }
            >
              <option value="in">{DIRECTOR_CASH_DIRECTION_LABELS.in}</option>
              <option value="out">{DIRECTOR_CASH_DIRECTION_LABELS.out}</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>Գումար (֏)</Label>
            <Input
              value={entryForm.amount}
              onChange={(e) => setEntryForm((f) => ({ ...f, amount: e.target.value }))}
              inputMode="numeric"
            />
          </div>
          <div className="space-y-1">
            <Label>Մեկնաբանություն</Label>
            <Input
              value={entryForm.comment}
              onChange={(e) => setEntryForm((f) => ({ ...f, comment: e.target.value }))}
            />
          </div>
        </div>
      </AppModal>
    </AdminLayout>
  );
}
