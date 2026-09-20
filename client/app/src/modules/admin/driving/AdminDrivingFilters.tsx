import { useMemo } from "react";
import { MapPin, Search } from "lucide-react";
import { Input } from "src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select";
import { useLang } from "src/lib/i18n";
import { cn } from "src/lib/utils";
import { ADMIN_BRANCH_FILTER_ALL } from "src/modules/admin/adminBranchFilter";
import { branchOptionLabel, useBranches } from "src/modules/branches";
import { cityNameById, useCities } from "src/modules/cities";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  /** Empty string = all branches. */
  branchId: string;
  onBranchIdChange: (value: string) => void;
  className?: string;
};

export default function AdminDrivingFilters({
  search,
  onSearchChange,
  branchId,
  onBranchIdChange,
  className,
}: Props) {
  const { t } = useLang();
  const { branches, loading } = useBranches();
  const { cities } = useCities();

  const selectedValue = branchId.trim() || ADMIN_BRANCH_FILTER_ALL;

  const selectedLabel = useMemo(() => {
    if (!branchId.trim()) return t("adminBranchFilterAll");
    const branch = branches.find((b) => String(b.id) === branchId);
    return branch ? branchOptionLabel(branch, cityNameById(cities, branch.cityId)) : branchId;
  }, [branchId, branches, cities, t]);

  return (
    <div
      className={cn(
        "flex min-w-0 w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="relative w-full min-w-0 sm:max-w-sm shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("adminDrivingSearchPlaceholder")}
          className="pl-9 h-9 w-full min-w-0"
          aria-label={t("search")}
        />
      </div>
      <Select
        value={selectedValue}
        onValueChange={(value) =>
          onBranchIdChange(value === ADMIN_BRANCH_FILTER_ALL ? "" : value)
        }
        disabled={loading && branches.length === 0}
      >
        <SelectTrigger
          size="sm"
          className="w-full sm:w-auto sm:min-w-[12rem] sm:max-w-[18rem] h-9 gap-1.5 border-border bg-background"
          aria-label={t("adminBranchFilterLabel")}
        >
          <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
          <SelectValue placeholder={t("adminBranchFilterAll")}>{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent align="end" className="max-h-[min(20rem,70vh)]">
          <SelectItem value={ADMIN_BRANCH_FILTER_ALL}>{t("adminBranchFilterAll")}</SelectItem>
          {branches.length === 0 && !loading ? (
            <SelectItem value="__empty__" disabled>
              {t("adminBranchFilterEmpty")}
            </SelectItem>
          ) : null}
          {branches.map((b) => (
            <SelectItem key={b.id} value={String(b.id)}>
              {branchOptionLabel(b, cityNameById(cities, b.cityId))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Case-insensitive instructor name match for driving grids. */
export function filterInstructorsBySearch<T extends { name: string }>(
  instructors: readonly T[],
  search: string,
): T[] {
  const q = search.trim().toLowerCase();
  if (!q) return [...instructors];
  return instructors.filter((i) => (i.name ?? "").toLowerCase().includes(q));
}

/**
 * Instructor name match, plus instructors who have a same-day booking whose
 * student name/phone matches the query (day graphic search).
 */
export function filterInstructorsBySearchOrStudentBooking<
  T extends { id: string | number; name: string },
>(
  instructors: readonly T[],
  search: string,
  bookings: readonly {
    instructor: { id: number | null; name: string };
    student: { name: string; phone: string | null; phone2?: string | null };
  }[],
): T[] {
  const q = search.trim().toLowerCase();
  if (!q) return [...instructors];

  const matchedIds = new Set<string>();
  const matchedNames = new Set<string>();
  for (const ins of instructors) {
    if ((ins.name ?? "").toLowerCase().includes(q)) {
      matchedIds.add(String(ins.id));
      matchedNames.add((ins.name ?? "").trim().toLowerCase());
    }
  }
  for (const b of bookings) {
    const hay = [b.student.name, b.student.phone, b.student.phone2]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) continue;
    if (b.instructor.id != null && b.instructor.id > 0) {
      matchedIds.add(String(b.instructor.id));
    } else {
      const n = (b.instructor.name ?? "").trim().toLowerCase();
      if (n) matchedNames.add(n);
    }
  }

  return instructors.filter((ins) => {
    if (matchedIds.has(String(ins.id))) return true;
    return matchedNames.has((ins.name ?? "").trim().toLowerCase());
  });
}
