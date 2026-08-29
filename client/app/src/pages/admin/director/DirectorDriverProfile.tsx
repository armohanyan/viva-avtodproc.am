import DirectorLayout from "src/modules/director/DirectorLayout";
import { useDirectorDateRange } from "src/modules/director/components/DirectorDateFilters";
import PanelPageHeader from "src/components/PanelPageHeader";
import {
  DirectorButton,
  DirectorCard,
  DirectorField,
  DirectorInput,
  DirectorSelect,
  DirectorStatCard,
  DirectorStatGrid,
  DirectorTableBody,
  DirectorTableHead,
  DirectorTableRow,
  DirectorTableTd,
  DirectorTableTh,
  DirectorTableWrap,
} from "src/modules/director/components/DirectorUi";
import { fetchDirectorDriverProfile } from "src/modules/director/director.api";
import type { DirectorDriverProfile } from "src/modules/director/director.types";
import type { Instructor } from "src/data/instructors";
import { formatAmd } from "src/pages/admin/finance/adminFinanceShared";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { useCallback, useEffect, useState } from "react";
import { User } from "lucide-react";

const EMPTY: DirectorDriverProfile = {
  instructorName: "",
  summary: { hours: 0, km: 0, liters: 0, amount: 0 },
  rows: [],
};

export default function DirectorDriverProfilePage() {
  const { showToast } = useToast();
  const { start, end, setStart, setEnd, query } = useDirectorDateRange();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [instructorUserId, setInstructorUserId] = useState("");
  const [data, setData] = useState<DirectorDriverProfile>(EMPTY);

  useEffect(() => {
    void vivaApiJson<Instructor[]>("/instructors")
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setInstructors(list);
        if (list[0]) setInstructorUserId(String(list[0].id));
      })
      .catch(() => setInstructors([]));
  }, []);

  const load = useCallback(async () => {
    const id = Number(instructorUserId);
    if (!id) return;
    try {
      const res = await fetchDirectorDriverProfile(query, id);
      setData(res);
    } catch (e) {
      setData(EMPTY);
      showToast(getApiErrorMessage(e), "error");
    }
  }, [query, instructorUserId, showToast]);

  return (
    <DirectorLayout>
      <PanelPageHeader icon={User} title="Վարորդի պրոֆիլ" />
      <DirectorCard>
        <div className="flex flex-wrap gap-4 items-end mb-5">
          <DirectorField label="Սկիզբ" className="w-auto">
            <DirectorInput type="date" className="w-auto" value={start} onChange={(e) => setStart(e.target.value)} />
          </DirectorField>
          <DirectorField label="Վերջ" className="w-auto">
            <DirectorInput type="date" className="w-auto" value={end} onChange={(e) => setEnd(e.target.value)} />
          </DirectorField>
          <DirectorField label="Հրահանգիչ">
            <DirectorSelect
              value={instructorUserId}
              onChange={(e) => setInstructorUserId(e.target.value)}
              className="min-w-[180px]"
            >
              {instructors.map((i) => (
                <option key={i.id} value={String(i.id)}>{i.name}</option>
              ))}
            </DirectorSelect>
          </DirectorField>
          <DirectorButton onClick={() => void load()}>Ցույց տալ</DirectorButton>
        </div>

        <DirectorStatGrid>
          <DirectorStatCard label="Ժամ" value={data.summary.hours.toFixed(1)} />
          <DirectorStatCard label="ԿՄ" value={data.summary.km.toFixed(0)} />
          <DirectorStatCard label="Լիտր" value={data.summary.liters.toFixed(1)} />
          <DirectorStatCard label="Գումար" value={formatAmd(data.summary.amount)} />
        </DirectorStatGrid>
      </DirectorCard>
      <DirectorTableWrap>
        <DirectorTableHead>
          <DirectorTableTh>Ամսաթիվ</DirectorTableTh>
          <DirectorTableTh>Ժամ</DirectorTableTh>
          <DirectorTableTh>ԿՄ</DirectorTableTh>
          <DirectorTableTh>Գազ</DirectorTableTh>
          <DirectorTableTh>Բենզին</DirectorTableTh>
          <DirectorTableTh>Լիտր</DirectorTableTh>
          <DirectorTableTh>Գումար</DirectorTableTh>
          <DirectorTableTh>Քարտ/POS</DirectorTableTh>
          <DirectorTableTh>Կանխիկ</DirectorTableTh>
          <DirectorTableTh>լ/100կմ</DirectorTableTh>
          <DirectorTableTh>դր/կմ</DirectorTableTh>
          <DirectorTableTh>կմ/ժ</DirectorTableTh>
        </DirectorTableHead>
        <DirectorTableBody>
          {data.rows.map((r) => (
            <DirectorTableRow key={r.date}>
              <DirectorTableTd>{r.date}</DirectorTableTd>
              <DirectorTableTd>{r.hours.toFixed(1)}</DirectorTableTd>
              <DirectorTableTd>{r.km.toFixed(0)}</DirectorTableTd>
              <DirectorTableTd>{r.gasLiters.toFixed(1)}</DirectorTableTd>
              <DirectorTableTd>{r.petrolLiters.toFixed(1)}</DirectorTableTd>
              <DirectorTableTd>{r.totalLiters.toFixed(1)}</DirectorTableTd>
              <DirectorTableTd>{formatAmd(r.amount)}</DirectorTableTd>
              <DirectorTableTd>{formatAmd(r.card)}</DirectorTableTd>
              <DirectorTableTd>{formatAmd(r.cash)}</DirectorTableTd>
              <DirectorTableTd>{r.lPer100.toFixed(1)}</DirectorTableTd>
              <DirectorTableTd>{r.amdPerKm.toFixed(0)}</DirectorTableTd>
              <DirectorTableTd>{r.kmPerHour.toFixed(1)}</DirectorTableTd>
            </DirectorTableRow>
          ))}
        </DirectorTableBody>
      </DirectorTableWrap>
    </DirectorLayout>
  );
}
