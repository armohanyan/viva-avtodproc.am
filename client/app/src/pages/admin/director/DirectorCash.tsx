import DirectorLayout from "src/modules/director/DirectorLayout";
import DirectorDynamicSelect from "src/modules/director/components/DirectorDynamicSelect";
import DirectorDateFilters, {
  useDirectorDateRange,
  useDirectorReload,
} from "src/modules/director/components/DirectorDateFilters";
import DirectorFormActions from "src/modules/director/components/DirectorFormActions";
import DirectorRecordActions from "src/modules/director/components/DirectorRecordActions";
import PanelPageHeader from "src/components/PanelPageHeader";
import {
  DirectorCard,
  DirectorField,
  DirectorFormRow,
  DirectorInput,
  DirectorSelect,
  DirectorTextarea,
  DirectorTableBody,
  DirectorTableHead,
  DirectorTableRow,
  DirectorTableTd,
  DirectorTableTh,
  DirectorTableWrap,
} from "src/modules/director/components/DirectorUi";
import {
  createDirectorCash,
  deleteDirectorCash,
  fetchDirectorCash,
  updateDirectorCash,
} from "src/modules/director/director.api";
import { DIRECTOR_OPTION_CATEGORY, todayIso } from "src/modules/director/director.consts";
import type { DirectorCashEntry } from "src/modules/director/director.types";
import { useBranches } from "src/modules/branches/useBranches";
import { formatAmd } from "src/pages/admin/finance/adminFinanceShared";
import {
  directorAmd,
  directorDate,
  directorOptionalComment,
  directorOptionalId,
  directorText,
} from "src/modules/director/directorFormValues";
import { getApiErrorMessage } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { useCallback, useState } from "react";
import { Wallet } from "lucide-react";

type CashForm = {
  date: string;
  branchId: string;
  entryType: string;
  amount: string;
  comment: string;
};

function emptyCashForm(branchId = ""): CashForm {
  return {
    date: todayIso(),
    branchId,
    entryType: "Ինկասացիա",
    amount: "",
    comment: "",
  };
}

export default function DirectorCashPage() {
  const { showToast } = useToast();
  const { branches } = useBranches();
  const { start, end, setStart, setEnd, query, branchFilterRevision } = useDirectorDateRange();
  const [rows, setRows] = useState<DirectorCashEntry[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CashForm>(() =>
    emptyCashForm(branches[0]?.id ? String(branches[0].id) : ""),
  );

  const load = useCallback(async () => {
    try {
      const list = await fetchDirectorCash(query);
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setRows([]);
      showToast(getApiErrorMessage(e), "error");
    }
  }, [query, showToast]);

  const reload = useDirectorReload(load, [query, branchFilterRevision]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyCashForm(branches[0]?.id ? String(branches[0].id) : ""));
  };

  const buildBody = () => ({
    date: directorDate(form.date),
    branchId: directorOptionalId(form.branchId),
    entryType: directorText(form.entryType),
    amount: directorAmd(form.amount),
    comment: directorOptionalComment(form.comment),
  });

  const submit = async () => {
    try {
      const body = buildBody();
      if (editingId != null) {
        await updateDirectorCash(editingId, body);
        showToast("Թարմացված է", "success");
      } else {
        await createDirectorCash(body);
        showToast("Գրանցված է", "success");
      }
      resetForm();
      reload();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const startEdit = (row: DirectorCashEntry) => {
    setEditingId(row.id);
    setForm({
      date: row.date,
      branchId: row.branchId != null ? String(row.branchId) : "",
      entryType: row.entryType,
      amount: String(row.amount),
      comment: row.comment ?? "",
    });
  };

  const branchName = (id: number | null) => {
    if (id == null) return "—";
    const b = branches.find((x) => String(x.id) === String(id));
    return b?.label || b?.name || `#${id}`;
  };

  return (
    <DirectorLayout>
      <PanelPageHeader icon={Wallet} title="Կասսա / Ինկասացիա" />
      <DirectorCard>
        <DirectorDateFilters start={start} end={end} onStartChange={setStart} onEndChange={setEnd} onRefresh={reload} />
        <DirectorFormRow>
          <DirectorField label="Ամսաթիվ">
            <DirectorInput type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </DirectorField>
          <DirectorField label="Մասնաճյուղ">
            <DirectorSelect value={form.branchId} onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}>
              <option value="">—</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>{b.label || b.name}</option>
              ))}
            </DirectorSelect>
          </DirectorField>
          <DirectorField label="Տեսակ">
            <DirectorDynamicSelect
              category={DIRECTOR_OPTION_CATEGORY.cashType}
              value={form.entryType}
              onChange={(entryType) => setForm((f) => ({ ...f, entryType }))}
            />
          </DirectorField>
          <DirectorField label="Գումար">
            <DirectorInput value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          </DirectorField>
          <DirectorField label="Մեկնաբանություն">
            <DirectorTextarea rows={3} value={form.comment} onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} />
          </DirectorField>
          <DirectorFormActions
            editing={editingId != null}
            createLabel="Գրանցել կասսա"
            onSubmit={() => void submit()}
            onCancel={resetForm}
          />
        </DirectorFormRow>
      </DirectorCard>
      <DirectorTableWrap>
        <DirectorTableHead>
          <DirectorTableTh>Ամսաթիվ</DirectorTableTh>
          <DirectorTableTh>Մասնաճյուղ</DirectorTableTh>
          <DirectorTableTh>Տեսակ</DirectorTableTh>
          <DirectorTableTh>Գումար</DirectorTableTh>
          <DirectorTableTh>Մեկնաբանություն</DirectorTableTh>
          <DirectorTableTh />
        </DirectorTableHead>
        <DirectorTableBody>
          {rows.map((r) => (
            <DirectorTableRow key={r.id}>
              <DirectorTableTd>{r.date}</DirectorTableTd>
              <DirectorTableTd>{branchName(r.branchId)}</DirectorTableTd>
              <DirectorTableTd>{r.entryType}</DirectorTableTd>
              <DirectorTableTd>{formatAmd(r.amount)}</DirectorTableTd>
              <DirectorTableTd>{r.comment ?? "—"}</DirectorTableTd>
              <DirectorTableTd>
                <DirectorRecordActions
                  onEdit={() => startEdit(r)}
                  onDelete={() => void deleteDirectorCash(r.id).then(reload)}
                />
              </DirectorTableTd>
            </DirectorTableRow>
          ))}
        </DirectorTableBody>
      </DirectorTableWrap>
    </DirectorLayout>
  );
}
