import { MapPin } from "lucide-react";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select";
import { useLang } from "src/lib/i18n";
import { ADMIN_BRANCH_FILTER_ALL } from "src/modules/admin/adminBranchFilter";
import { branchOptionLabel, useBranches } from "src/modules/branches";
import { cityNameById, useCities } from "src/modules/cities";
import { todayIso, type DirectorCashViewBy } from "src/modules/director/director.consts";

export type CashRegisterAdminOption = { id: string; name: string };

type Props = {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  viewBy: DirectorCashViewBy;
  onViewByChange: (value: DirectorCashViewBy) => void;
  branchId: string | null;
  onBranchIdChange: (value: string | null) => void;
  adminUserId: string | null;
  onAdminUserIdChange: (value: string | null) => void;
  adminOptions: CashRegisterAdminOption[];
  showAllBranchesOption: boolean;
  onApply: () => void;
};

function shiftIsoDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + delta);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function monthStartIso(iso: string): string {
  const y = iso.slice(0, 4);
  const m = iso.slice(5, 7);
  return `${y}-${m}-01`;
}

export default function CashRegisterFilters({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  viewBy,
  onViewByChange,
  branchId,
  onBranchIdChange,
  adminUserId,
  onAdminUserIdChange,
  adminOptions,
  showAllBranchesOption,
  onApply,
}: Props) {
  const { t } = useLang();
  const { branches, loading } = useBranches();
  const { cities } = useCities();

  const selectedValue = branchId?.trim() ? branchId : ADMIN_BRANCH_FILTER_ALL;

  const selectedLabel = (() => {
    if (!branchId?.trim()) return t("adminBranchFilterAll");
    const branch = branches.find((b) => String(b.id) === branchId);
    return branch ? branchOptionLabel(branch, cityNameById(cities, branch.cityId)) : branchId;
  })();

  const today = todayIso();

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-1">
          <Label htmlFor="cr-start">Սկզբի ամսաթիվ</Label>
          <Input
            id="cr-start"
            type="date"
            className="w-full sm:w-auto"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value || today)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cr-end">Վերջի ամսաթիվ</Label>
          <Input
            id="cr-end"
            type="date"
            className="w-full sm:w-auto"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value || today)}
          />
        </div>
        <div className="space-y-1 min-w-[10rem]">
          <Label>Դիտել ըստ</Label>
          <Select
            value={viewBy}
            onValueChange={(v) => onViewByChange(v as DirectorCashViewBy)}
          >
            <SelectTrigger className="w-full sm:min-w-[10rem] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="branch">Մասնաճյուղ</SelectItem>
              <SelectItem value="admin">Ադմին</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {viewBy === "admin" ? (
          <div className="space-y-1 min-w-[12rem] flex-1 sm:flex-none">
            <Label>Ադմին</Label>
            <Select
              value={adminUserId ?? "all"}
              onValueChange={(value) => onAdminUserIdChange(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-full sm:min-w-[12rem] h-9">
                <SelectValue placeholder="Բոլորը" />
              </SelectTrigger>
              <SelectContent className="max-h-[min(20rem,70vh)]">
                <SelectItem value="all">Բոլորը</SelectItem>
                {adminOptions.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-1 min-w-[12rem] flex-1 sm:flex-none">
            <Label>Մասնաճյուղ</Label>
            <Select
              value={selectedValue}
              onValueChange={(value) =>
                onBranchIdChange(value === ADMIN_BRANCH_FILTER_ALL ? null : value)
              }
              disabled={loading && branches.length === 0}
            >
              <SelectTrigger className="w-full sm:min-w-[12rem] h-9 gap-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                <SelectValue placeholder={t("adminBranchFilterAll")}>{selectedLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[min(20rem,70vh)]">
                {showAllBranchesOption ? (
                  <SelectItem value={ADMIN_BRANCH_FILTER_ALL}>{t("adminBranchFilterAll")}</SelectItem>
                ) : null}
                {branches.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {branchOptionLabel(b, cityNameById(cities, b.cityId))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button type="button" className="sm:mb-0" onClick={onApply}>
          Ցույց տալ
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const y = shiftIsoDays(today, -1);
            onStartDateChange(y);
            onEndDateChange(y);
          }}
        >
          Երեկ
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            onStartDateChange(today);
            onEndDateChange(today);
          }}
        >
          Այսօր
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            onStartDateChange(monthStartIso(today));
            onEndDateChange(today);
          }}
        >
          Այս ամիս
        </Button>
      </div>
    </div>
  );
}
