import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminBranchFilterSnapshot } from "src/modules/admin/AdminBranchFilterProvider";
import { useBranches } from "src/modules/branches/useBranches";
import { defaultDirectorStartDate, directorDateQuery, todayIso } from "src/modules/director/director.consts";
import { DirectorButton, DirectorField, DirectorInput, DirectorSelect } from "./DirectorUi";

type Props = {
  start: string;
  end: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onRefresh: () => void;
  showBranch?: boolean;
  branchId?: string;
  onBranchChange?: (v: string) => void;
};

export function useDirectorDateRange(initialStart?: string, initialEnd?: string) {
  const today = todayIso();
  const [start, setStart] = useState(initialStart ?? defaultDirectorStartDate());
  const [end, setEnd] = useState(initialEnd ?? today);
  const { branchId, revision: branchFilterRevision } = useAdminBranchFilterSnapshot();
  const query = useMemo(
    () => directorDateQuery(start, end, branchId),
    [start, end, branchId],
  );
  return { start, end, setStart, setEnd, query, branchFilterRevision, branchId };
}

export default function DirectorDateFilters({
  start,
  end,
  onStartChange,
  onEndChange,
  onRefresh,
  showBranch,
  branchId,
  onBranchChange,
}: Props) {
  const { branches } = useBranches();

  return (
    <div className="flex flex-wrap gap-4 items-end mb-5">
      <DirectorField label="Սկիզբ" className="w-auto">
        <DirectorInput type="date" className="w-auto" value={start} onChange={(e) => onStartChange(e.target.value)} />
      </DirectorField>
      <DirectorField label="Վերջ" className="w-auto">
        <DirectorInput type="date" className="w-auto" value={end} onChange={(e) => onEndChange(e.target.value)} />
      </DirectorField>
      {showBranch && onBranchChange ? (
        <DirectorField label="Մասնաճյուղ">
          <DirectorSelect value={branchId ?? "all"} onChange={(e) => onBranchChange(e.target.value)}>
            <option value="all">Բոլորը</option>
            {branches.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.label || b.name}
              </option>
            ))}
          </DirectorSelect>
        </DirectorField>
      ) : null}
      <DirectorButton onClick={onRefresh}>Թարմացնել</DirectorButton>
    </div>
  );
}

export function useDirectorReload(loadFn: () => Promise<void>, deps: unknown[]) {
  const reload = useCallback(() => {
    void loadFn();
  }, [loadFn]);
  useEffect(() => {
    void loadFn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return reload;
}
