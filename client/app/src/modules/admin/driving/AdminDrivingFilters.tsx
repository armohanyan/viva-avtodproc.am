import { useMemo } from "react";
import { ChevronDown, MapPin, Search } from "lucide-react";
import { Button } from "src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "src/components/ui/dropdown-menu";
import { Input } from "src/components/ui/input";
import { useLang } from "src/lib/i18n";
import { cn } from "src/lib/utils";
import { branchOptionLabel, useBranches } from "src/modules/branches";
import { cityNameById, useCities } from "src/modules/cities";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  /** Empty = all branches. Otherwise only these branches. */
  branchIds: readonly string[];
  onBranchIdsChange: (value: string[]) => void;
  className?: string;
};

export default function AdminDrivingFilters({
  search,
  onSearchChange,
  branchIds,
  onBranchIdsChange,
  className,
}: Props) {
  const { t } = useLang();
  const { branches, loading } = useBranches();
  const { cities } = useCities();

  const selectedSet = useMemo(() => new Set(branchIds.map(String)), [branchIds]);
  const allSelected = branchIds.length === 0;

  const selectedLabel = useMemo(() => {
    if (allSelected) return t("adminBranchFilterAll");
    const labels = branchIds.map((id) => {
      const branch = branches.find((b) => String(b.id) === id);
      return branch ? branchOptionLabel(branch, cityNameById(cities, branch.cityId)) : id;
    });
    if (labels.length <= 2) return labels.join(", ");
    return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
  }, [allSelected, branchIds, branches, cities, t]);

  const setBranches = (ids: Iterable<string>) => {
    const next = new Set([...ids].map(String));
    if (next.size === 0 || next.size >= branches.length) {
      onBranchIdsChange([]);
      return;
    }
    onBranchIdsChange(
      branches.map((b) => String(b.id)).filter((id) => next.has(id)),
    );
  };

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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={loading && branches.length === 0}
            className="h-9 w-full min-w-0 justify-between gap-1.5 overflow-hidden border-border bg-background px-3 font-normal shadow-xs sm:w-auto sm:min-w-[12rem] sm:max-w-[22rem]"
            aria-label={t("adminBranchFilterLabel")}
          >
            <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-left">{selectedLabel}</span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-[min(20rem,70vh)] min-w-[12rem]">
          <DropdownMenuCheckboxItem
            checked={allSelected}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={() => onBranchIdsChange([])}
          >
            {t("adminBranchFilterAll")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          {branches.length === 0 && !loading ? (
            <DropdownMenuCheckboxItem checked={false} disabled>
              {t("adminBranchFilterEmpty")}
            </DropdownMenuCheckboxItem>
          ) : null}
          {branches.map((b) => {
            const id = String(b.id);
            return (
              <DropdownMenuCheckboxItem
                key={b.id}
                checked={!allSelected && selectedSet.has(id)}
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={(checked) => {
                  const next = new Set(allSelected ? [] : selectedSet);
                  if (checked) next.add(id);
                  else next.delete(id);
                  setBranches(next);
                }}
              >
                {branchOptionLabel(b, cityNameById(cities, b.cityId))}
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
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
