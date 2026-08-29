import DirectorLayout from "src/modules/director/DirectorLayout";
import DirectorDynamicSelect from "src/modules/director/components/DirectorDynamicSelect";
import DirectorDateFilters, {
  useDirectorDateRange,
  useDirectorReload,
} from "src/modules/director/components/DirectorDateFilters";
import PanelPageHeader from "src/components/PanelPageHeader";
import {
  DirectorButton,
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
import { createDirectorCash, deleteDirectorCash, fetchDirectorCash } from "src/modules/director/director.api";
import { DIRECTOR_OPTION_CATEGORY, todayIso } from "src/modules/director/director.consts";
import type { DirectorCashEntry } from "src/modules/director/director.types";
import { useBranches } from "src/modules/branches/useBranches";
import { formatAmd, parseAmdInput } from "src/pages/admin/finance/adminFinanceShared";
import { getApiErrorMessage } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { useCallback, useState } from "react";
import { Wallet } from "lucide-react";

export default function DirectorCashPage() {
  const { showToast } = useToast();
  const { branches } = useBranches();
  const { start, end, setStart, setEnd, query, branchFilterRevision } = useDirectorDateRange();
  const [rows, setRows] = useState<DirectorCashEntry[]>([]);
  const [form, setForm] = useState({
    date: todayIso(),
    branchId: branches[0]?.id ? String(branches[0].id) : "",
    entryType: "Ինկասացիա",
    amount: "",
    comment: "",
  });

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

  const submit = async () => {
    const amount = parseAmdInput(form.amount);
    const branchId = Number(form.branchId);
    if (!amount || !branchId || !form.entryType) {
      showToast("Լրացրեք բոլոր դաշտերը", "error");
      return;
    }
    try {
      await createDirectorCash({
        date: form.date,
        branchId,
        entryType: form.entryType,
        amount,
        comment: form.comment.trim() || null,
      });
      setForm((f) => ({ ...f, amount: "", comment: "" }));
      reload();
      showToast("Գրանցված է", "success");
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const branchName = (id: number) => {
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
          <DirectorButton className="self-start" onClick={() => void submit()}>Գրանցել կասսա</DirectorButton>
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
                <DirectorButton variant="ghost" size="sm" onClick={() => void deleteDirectorCash(r.id).then(reload)}>
                  Ջնջել
                </DirectorButton>
              </DirectorTableTd>
            </DirectorTableRow>
          ))}
        </DirectorTableBody>
      </DirectorTableWrap>
    </DirectorLayout>
  );
}
