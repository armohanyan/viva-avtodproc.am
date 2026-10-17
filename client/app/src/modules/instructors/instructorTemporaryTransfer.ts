import type { Instructor, InstructorTemporaryTransfer } from "src/data/instructors";

export type BranchMembershipInstructor = {
  availableBranchIds?: readonly string[];
  temporaryTransfers?: readonly {
    branchId: string;
    startsOn: string;
    endsOn?: string | null;
    temporary?: boolean;
  }[];
};

const OPEN_ENDED = "9999-12-31";

function dayIso(value: string): string {
  return String(value ?? "").slice(0, 10);
}

export function normalizeTemporaryTransfers(raw: unknown): InstructorTemporaryTransfer[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Partial<InstructorTemporaryTransfer> & { id?: string | number; branchId?: string | number };
    const startsOn = dayIso(String(item.startsOn ?? ""));
    const rawEnd = item.endsOn == null || item.endsOn === "" ? "" : dayIso(String(item.endsOn));
    const endsOn = /^\d{4}-\d{2}-\d{2}$/.test(rawEnd) ? rawEnd : null;
    const branchId = item.branchId == null ? "" : String(item.branchId);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !branchId) return [];
    const temporary = typeof item.temporary === "boolean" ? item.temporary : endsOn != null;
    return [
      {
        id: item.id == null ? `${branchId}-${startsOn}-${endsOn ?? "open"}` : String(item.id),
        branchId,
        startsOn,
        endsOn: temporary ? endsOn ?? "" : null,
        temporary,
      },
    ];
  });
}

function isOpenEndedMove(transfer: { endsOn?: string | null; temporary?: boolean }): boolean {
  if (transfer.temporary === true) return false;
  if (transfer.temporary === false) return true;
  return transfer.endsOn == null || transfer.endsOn === "";
}

export function transferCoversDate(
  transfer: { startsOn: string; endsOn?: string | null; temporary?: boolean },
  dateIso: string,
): boolean {
  const day = dayIso(dateIso);
  const start = dayIso(transfer.startsOn);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{4}-\d{2}-\d{2}$/.test(start) || day < start) return false;
  if (isOpenEndedMove(transfer)) return true;
  const end = transfer.endsOn == null ? "" : dayIso(transfer.endsOn);
  return /^\d{4}-\d{2}-\d{2}$/.test(end) && day <= end;
}

/** Home branches, unless a move covers the date — then only that branch. */
export function effectiveBranchIdsForDate(
  instructor: BranchMembershipInstructor,
  dateIso: string,
): string[] {
  const active = (instructor.temporaryTransfers ?? [])
    .filter((transfer) => transferCoversDate(transfer, dateIso))
    .sort((a, b) => dayIso(b.startsOn).localeCompare(dayIso(a.startsOn)))[0];
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
 * Branches that still have a bookable day from today on.
 * A move with no end date that has already started replaces the home branches.
 */
export function branchIdsForUndatedPicker(
  instructor: BranchMembershipInstructor,
  todayIso: string,
): string[] {
  const today = dayIso(todayIso);
  const transfers = instructor.temporaryTransfers ?? [];
  const startedOpen = transfers
    .filter((transfer) => isOpenEndedMove(transfer) && dayIso(transfer.startsOn) <= today)
    .sort((a, b) => dayIso(b.startsOn).localeCompare(dayIso(a.startsOn)))[0];
  if (startedOpen) return [String(startedOpen.branchId)];
  const ids = new Set((instructor.availableBranchIds ?? []).map(String));
  for (const transfer of transfers) {
    if (isOpenEndedMove(transfer)) {
      ids.add(String(transfer.branchId));
      continue;
    }
    const end = transfer.endsOn == null ? "" : dayIso(transfer.endsOn);
    if (/^\d{4}-\d{2}-\d{2}$/.test(end) && end >= today) ids.add(String(transfer.branchId));
  }
  return Array.from(ids);
}

export function temporaryTransfersOverlap(rows: readonly InstructorTemporaryTransfer[]): boolean {
  const ready = rows.filter(
    (row) =>
      /^\d{4}-\d{2}-\d{2}$/.test(row.startsOn) &&
      (!row.temporary || /^\d{4}-\d{2}-\d{2}$/.test(row.endsOn ?? "")),
  );
  const endKey = (row: InstructorTemporaryTransfer) => (row.temporary ? dayIso(row.endsOn ?? "") : OPEN_ENDED);
  const sorted = [...ready].sort((a, b) => a.startsOn.localeCompare(b.startsOn) || endKey(a).localeCompare(endKey(b)));
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1]!;
    const next = sorted[i]!;
    if (prev.startsOn <= endKey(next) && next.startsOn <= endKey(prev)) return true;
  }
  return false;
}

export function instructorWithTransfers(instructor: Instructor): Instructor {
  return {
    ...instructor,
    temporaryTransfers: normalizeTemporaryTransfers(instructor.temporaryTransfers),
  };
}
