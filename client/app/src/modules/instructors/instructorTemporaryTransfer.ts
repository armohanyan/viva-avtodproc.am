import type { Instructor, InstructorTemporaryTransfer } from "src/data/instructors";

export type BranchMembershipInstructor = {
  availableBranchIds?: readonly string[];
  temporaryTransfers?: readonly {
    branchId: string;
    startsOn: string;
    endsOn: string;
  }[];
};

function dayIso(value: string): string {
  return String(value ?? "").slice(0, 10);
}

export function normalizeTemporaryTransfers(raw: unknown): InstructorTemporaryTransfer[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Partial<InstructorTemporaryTransfer> & { id?: string | number; branchId?: string | number };
    const startsOn = dayIso(String(item.startsOn ?? ""));
    const endsOn = dayIso(String(item.endsOn ?? ""));
    const branchId = item.branchId == null ? "" : String(item.branchId);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(endsOn) || !branchId) {
      return [];
    }
    return [
      {
        id: item.id == null ? `${branchId}-${startsOn}-${endsOn}` : String(item.id),
        branchId,
        startsOn,
        endsOn,
      },
    ];
  });
}

export function transferCoversDate(
  transfer: { startsOn: string; endsOn: string },
  dateIso: string,
): boolean {
  const day = dayIso(dateIso);
  return day >= dayIso(transfer.startsOn) && day <= dayIso(transfer.endsOn);
}

/** Permanent branches, unless a transfer covers the date — then only that branch. */
export function effectiveBranchIdsForDate(
  instructor: BranchMembershipInstructor,
  dateIso: string,
): string[] {
  const active = (instructor.temporaryTransfers ?? []).find((transfer) => transferCoversDate(transfer, dateIso));
  if (active) return [String(active.branchId)];
  return (instructor.availableBranchIds ?? []).map(String);
}

export function instructorServesBranchOnDate(
  instructor: BranchMembershipInstructor,
  branchId: string,
  dateIso: string,
): boolean {
  const id = String(branchId);
  return effectiveBranchIdsForDate(instructor, dateIso).includes(id);
}

/** Branches effective on at least one of the given dates. */
export function branchIdsEffectiveOnAnyDate(
  instructor: BranchMembershipInstructor,
  dateIsos: readonly string[],
): string[] {
  const ids = new Set<string>();
  for (const dateIso of dateIsos) {
    for (const id of effectiveBranchIdsForDate(instructor, dateIso)) ids.add(id);
  }
  return Array.from(ids);
}

/** Branches that cover every listed date. Empty when the dates span a transfer boundary. */
export function branchIdsEffectiveOnEveryDate(
  instructor: BranchMembershipInstructor,
  dateIsos: readonly string[],
): string[] {
  const dates = dateIsos.map(dayIso).filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day));
  if (dates.length === 0) return [];
  let shared: Set<string> | null = null;
  for (const dateIso of dates) {
    const ids = new Set(effectiveBranchIdsForDate(instructor, dateIso));
    if (shared == null) {
      shared = ids;
      continue;
    }
    const next = new Set<string>();
    shared.forEach((id) => {
      if (ids.has(id)) next.add(id);
    });
    shared = next;
  }
  return Array.from(shared ?? []);
}

/**
 * Undated picker: permanent branches, plus transfer targets that have not ended.
 * Home branches stay listed so days outside the window can still be booked.
 */
export function branchIdsForUndatedPicker(
  instructor: BranchMembershipInstructor,
  todayIso: string,
): string[] {
  const ids = new Set((instructor.availableBranchIds ?? []).map(String));
  const today = dayIso(todayIso);
  for (const transfer of instructor.temporaryTransfers ?? []) {
    if (dayIso(transfer.endsOn) >= today) ids.add(String(transfer.branchId));
  }
  return [...ids];
}

export function temporaryTransfersOverlap(rows: readonly InstructorTemporaryTransfer[]): boolean {
  const sorted = [...rows].sort((a, b) => a.startsOn.localeCompare(b.startsOn) || a.endsOn.localeCompare(b.endsOn));
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1]!;
    const next = sorted[i]!;
    if (prev.startsOn <= next.endsOn && next.startsOn <= prev.endsOn) return true;
  }
  return false;
}

export function instructorWithTransfers(instructor: Instructor): Instructor {
  return {
    ...instructor,
    temporaryTransfers: normalizeTemporaryTransfers(instructor.temporaryTransfers),
  };
}
