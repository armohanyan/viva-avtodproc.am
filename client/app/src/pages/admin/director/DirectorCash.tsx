import DirectorLayout from "src/modules/director/DirectorLayout";
import { useDirectorReload } from "src/modules/director/components/DirectorDateFilters";
import DirectorAddRecordButton from "src/modules/director/components/DirectorAddRecordButton";
import DirectorRecordFormDialog from "src/modules/director/components/DirectorRecordFormDialog";
import DirectorRecordActions from "src/modules/director/components/DirectorRecordActions";
import DirectorDataTable from "src/modules/director/components/DirectorDataTable";
import PanelPageHeader from "src/components/PanelPageHeader";
import {
  DirectorButton,
  DirectorField,
  DirectorInput,
  DirectorSelect,
  DirectorStatCard,
  DirectorStatGrid,
  DirectorTextarea,
} from "src/modules/director/components/DirectorUi";
import {
  createDirectorCash,
  deleteDirectorCash,
  fetchDirectorCash,
  updateDirectorCash,
} from "src/modules/director/director.api";
import {
  DIRECTOR_CASH_DIRECTION_LABELS,
  DIRECTOR_CASH_SOURCE_LABELS,
  DIRECTOR_PAYMENT_LABELS,
  directorDateQuery,
  todayIso,
} from "src/modules/director/director.consts";
import type { DirectorCashDirection, DirectorCashEntry } from "src/modules/director/director.types";
import { useBranches } from "src/modules/branches/useBranches";
import { useAdminBranchFilterSnapshot } from "src/modules/admin/AdminBranchFilterProvider";
import {
  ADMIN_BRANCH_FILTER_ALL,
  setAdminBranchFilterId,
} from "src/modules/admin/adminBranchFilter";
import { formatAmd } from "src/pages/admin/finance/adminFinanceShared";
import {
  directorAmd,
  directorDate,
  directorOptionalComment,
  directorOptionalId,
} from "src/modules/director/directorFormValues";
import { useDirectorTable } from "src/modules/director/useDirectorTable";
import { getApiErrorMessage } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { useCallback, useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { cn } from "src/lib/utils";

type CashForm = {
  direction: DirectorCashDirection;
  amount: string;
  comment: string;
  branchId: string;
};

function emptyCashForm(branchId = ""): CashForm {
  return {
    direction: "in",
    amount: "",
    comment: "",
    branchId,
  };
}

export default function DirectorCashPage() {
  const { showToast } = useToast();
  const { branches } = useBranches();
  const { branchId: filterBranchId, revision: branchFilterRevision } = useAdminBranchFilterSnapshot();
  const [day, setDay] = useState(todayIso);
  const [rows, setRows] = useState<DirectorCashEntry[]>([]);
  const [balance, setBalance] = useState(0);
  const [dayIn, setDayIn] = useState(0);
  const [dayOut, setDayOut] = useState(0);
  const [dayCashIn, setDayCashIn] = useState(0);
  const [dayCardIn, setDayCardIn] = useState(0);
  const [dayCashOut, setDayCashOut] = useState(0);
  const [dayCardOut, setDayCardOut] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CashForm>(() =>
    emptyCashForm(branches[0]?.id ? String(branches[0].id) : ""),
  );

  const query = useMemo(
    () => directorDateQuery(day, day, filterBranchId),
    [day, filterBranchId],
  );

  const isToday = day === todayIso();
  const dayNet = dayIn - dayOut;

  const load = useCallback(async () => {
    try {
      const data = await fetchDirectorCash(query);
      setRows(data.entries);
      setBalance(data.balance);
      setDayIn(data.periodIn);
      setDayOut(data.periodOut);
      setDayCashIn(data.periodCashIn);
      setDayCardIn(data.periodCardIn);
      setDayCashOut(data.periodCashOut);
      setDayCardOut(data.periodCardOut);
    } catch (e) {
      setRows([]);
      setBalance(0);
      setDayIn(0);
      setDayOut(0);
      setDayCashIn(0);
      setDayCardIn(0);
      setDayCashOut(0);
      setDayCardOut(0);
      showToast(getApiErrorMessage(e), "error");
    }
  }, [query, showToast]);

  const reload = useDirectorReload(load, [query, branchFilterRevision]);

  const resetForm = () => {
    setEditingId(null);
    setForm(
      emptyCashForm(
        filterBranchId || (branches[0]?.id ? String(branches[0].id) : ""),
      ),
    );
  };

  const closeForm = () => {
    resetForm();
    setFormOpen(false);
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const onBranchFilterChange = (value: string) => {
    setAdminBranchFilterId(value === ADMIN_BRANCH_FILTER_ALL || !value ? null : value);
  };

  const submit = async () => {
    try {
      const body = {
        date: directorDate(day),
        branchId: directorOptionalId(form.branchId),
        direction: form.direction,
        amount: directorAmd(form.amount),
        comment: directorOptionalComment(form.comment),
      };
      if (body.amount <= 0) {
        showToast("Գումարը պետք է լինի դրական", "error");
        return;
      }
      if (editingId != null) {
        await updateDirectorCash(editingId, body);
        showToast("Թարմացված է", "success");
      } else {
        await createDirectorCash(body);
        showToast("Գրանցված է", "success");
      }
      closeForm();
      reload();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const startEdit = (row: DirectorCashEntry) => {
    if (row.readOnly || row.source !== "manual") return;
    setEditingId(row.sourceId);
    setForm({
      direction: row.direction,
      amount: String(row.amount),
      comment: row.comment ?? "",
      branchId: row.branchId != null ? String(row.branchId) : "",
    });
    setFormOpen(true);
  };

  const branchName = (id: number | null) => {
    if (id == null) return "-";
    const b = branches.find((x) => String(x.id) === String(id));
    return b?.label || b?.name || `#${id}`;
  };

  const tableColumns = useMemo(
    () => [
      {
        id: "source",
        header: "Աղբյուր",
        sortable: true,
        filterable: true,
        sortValue: (r: DirectorCashEntry) => DIRECTOR_CASH_SOURCE_LABELS[r.source],
        filterValue: (r: DirectorCashEntry) => DIRECTOR_CASH_SOURCE_LABELS[r.source],
        searchValue: (r: DirectorCashEntry) => DIRECTOR_CASH_SOURCE_LABELS[r.source],
        render: (r: DirectorCashEntry) => DIRECTOR_CASH_SOURCE_LABELS[r.source],
      },
      {
        id: "payment",
        header: "Վճարում",
        sortable: true,
        filterable: true,
        sortValue: (r: DirectorCashEntry) => DIRECTOR_PAYMENT_LABELS[r.paymentMethod],
        filterValue: (r: DirectorCashEntry) => DIRECTOR_PAYMENT_LABELS[r.paymentMethod],
        searchValue: (r: DirectorCashEntry) => DIRECTOR_PAYMENT_LABELS[r.paymentMethod],
        render: (r: DirectorCashEntry) => DIRECTOR_PAYMENT_LABELS[r.paymentMethod],
      },
      {
        id: "direction",
        header: "Ուղղություն",
        sortable: true,
        filterable: true,
        sortValue: (r: DirectorCashEntry) => DIRECTOR_CASH_DIRECTION_LABELS[r.direction],
        filterValue: (r: DirectorCashEntry) => DIRECTOR_CASH_DIRECTION_LABELS[r.direction],
        searchValue: (r: DirectorCashEntry) => DIRECTOR_CASH_DIRECTION_LABELS[r.direction],
        render: (r: DirectorCashEntry) => (
          <span
            className={cn(
              r.direction === "in"
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-rose-700 dark:text-rose-400",
            )}
          >
            {DIRECTOR_CASH_DIRECTION_LABELS[r.direction]}
          </span>
        ),
      },
      {
        id: "amount",
        header: "Գումար",
        sortable: true,
        sortValue: (r: DirectorCashEntry) => r.amount,
        searchValue: (r: DirectorCashEntry) => formatAmd(r.amount),
        render: (r: DirectorCashEntry) => (
          <span
            className={cn(
              "font-medium",
              r.direction === "in"
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-rose-700 dark:text-rose-400",
            )}
          >
            {r.direction === "out" ? "-" : "+"}
            {formatAmd(r.amount)}
          </span>
        ),
      },
      {
        id: "branch",
        header: "Մասնաճյուղ",
        sortable: true,
        filterable: true,
        sortValue: (r: DirectorCashEntry) => branchName(r.branchId),
        filterValue: (r: DirectorCashEntry) => branchName(r.branchId),
        searchValue: (r: DirectorCashEntry) => branchName(r.branchId),
        render: (r: DirectorCashEntry) => branchName(r.branchId),
      },
      {
        id: "comment",
        header: "Մեկնաբանություն",
        searchValue: (r: DirectorCashEntry) => r.comment ?? "",
        render: (r: DirectorCashEntry) => r.comment ?? "-",
      },
      {
        id: "actions",
        header: "",
        align: "end" as const,
        render: (r: DirectorCashEntry) =>
          r.readOnly || r.source !== "manual" ? (
            <span className="text-xs text-muted-foreground">Ավտոմատ</span>
          ) : (
            <DirectorRecordActions
              onEdit={() => startEdit(r)}
              onDelete={() => void deleteDirectorCash(r.sourceId).then(reload)}
            />
          ),
      },
    ],
    [branches, reload],
  );

  const table = useDirectorTable({ rows, columns: tableColumns });

  return (
    <DirectorLayout>
      <PanelPageHeader
        icon={Wallet}
        title="Կասսա"
        subtitle={isToday ? "Այսօրվա մուտքեր և ելքեր" : `Օրվա արդյունք · ${day}`}
      />

      <div className="flex flex-col gap-3 mb-5 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
        <DirectorField label="Օր" className="w-full sm:w-auto">
          <DirectorInput
            type="date"
            className="w-full sm:w-auto"
            value={day}
            onChange={(e) => setDay(e.target.value || todayIso())}
          />
        </DirectorField>
        <DirectorField label="Մասնաճյուղ" className="w-full sm:w-auto">
          <DirectorSelect
            className="w-full sm:w-auto min-w-[12rem]"
            value={filterBranchId ?? ADMIN_BRANCH_FILTER_ALL}
            onChange={(e) => onBranchFilterChange(e.target.value)}
          >
            <option value={ADMIN_BRANCH_FILTER_ALL}>Բոլորը</option>
            {branches.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.label || b.name}
              </option>
            ))}
          </DirectorSelect>
        </DirectorField>
        {!isToday ? (
          <DirectorButton className="w-full sm:w-auto" variant="ghost" onClick={() => setDay(todayIso())}>
            Այսօր
          </DirectorButton>
        ) : null}
        <DirectorButton className="w-full sm:w-auto" onClick={reload}>
          Թարմացնել
        </DirectorButton>
      </div>

      <DirectorStatGrid>
        <DirectorStatCard label={isToday ? "Այսօրվա մուտք" : "Օրվա մուտք"} value={formatAmd(dayIn)} />
        <DirectorStatCard label="Մուտք · կանխիկ" value={formatAmd(dayCashIn)} />
        <DirectorStatCard label="Մուտք · քարտ" value={formatAmd(dayCardIn)} />
        <DirectorStatCard label={isToday ? "Այսօրվա ելք" : "Օրվա ելք"} value={formatAmd(dayOut)} />
        <DirectorStatCard label="Ելք · կանխիկ" value={formatAmd(dayCashOut)} />
        <DirectorStatCard label="Ելք · քարտ" value={formatAmd(dayCardOut)} />
        <DirectorStatCard label={isToday ? "Այսօրվա տարբերություն" : "Օրվա տարբերություն"} value={formatAmd(dayNet)} />
        <DirectorStatCard label="Կանխիկ մնացորդ" value={formatAmd(balance)} />
      </DirectorStatGrid>

      <div className="mt-6">
        <DirectorDataTable
          table={table}
          columns={tableColumns}
          rowKey={(r) => `${r.source}:${r.sourceId}`}
          toolbarActions={<DirectorAddRecordButton onClick={openCreate} />}
        />
      </div>

      <DirectorRecordFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editingId != null ? "Խմբագրել գրառում" : "Նոր գրառում"}
        editing={editingId != null}
        createLabel={isToday ? "Գրանցել այսօր" : "Գրանցել այս օրը"}
        onSubmit={() => void submit()}
        onCancel={closeForm}
      >
        <DirectorField label="Ուղղություն">
          <DirectorSelect
            value={form.direction}
            onChange={(e) =>
              setForm((f) => ({ ...f, direction: e.target.value as DirectorCashDirection }))
            }
          >
            <option value="in">{DIRECTOR_CASH_DIRECTION_LABELS.in}</option>
            <option value="out">{DIRECTOR_CASH_DIRECTION_LABELS.out}</option>
          </DirectorSelect>
        </DirectorField>
        <DirectorField label="Գումար">
          <DirectorInput
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            inputMode="numeric"
          />
        </DirectorField>
        <DirectorField label="Մասնաճյուղ">
          <DirectorSelect
            value={form.branchId}
            onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
          >
            <option value="">-</option>
            {branches.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.label || b.name}
              </option>
            ))}
          </DirectorSelect>
        </DirectorField>
        <DirectorField label="Մեկնաբանություն">
          <DirectorTextarea
            rows={3}
            value={form.comment}
            onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
            placeholder="Օր. ինկասացիա, կանխիկ վճարում"
          />
        </DirectorField>
      </DirectorRecordFormDialog>
    </DirectorLayout>
  );
}
