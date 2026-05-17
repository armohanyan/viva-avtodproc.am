/** Build admin bookings URL that opens the add modal with a student (and branch) pre-selected. */
export function adminBookingsHrefFromStudent(opts: {
  studentId: string | number;
  branchId?: string | number | null;
  instructorName?: string | null;
}): string {
  const p = new URLSearchParams({
    new: "1",
    flow: "practical",
    student: String(opts.studentId),
  });
  const branch = String(opts.branchId ?? "").trim();
  if (branch) p.set("branch", branch);
  const instructorName = String(opts.instructorName ?? "").trim();
  if (instructorName) p.set("instructorName", instructorName);
  return `/admin/bookings?${p.toString()}`;
}

/** Build admin bookings URL that opens the add modal prefilled from a theory-personal lesson request. */
export function adminBookingsHrefFromTheoryPersonalRequest(row: {
  id: string;
  studentUserId: number;
  instructorUserId: number;
  branchId: number;
  selectedThemes: string[];
}): string {
  const p = new URLSearchParams({
    new: "1",
    flow: "theory_personal",
    student: String(row.studentUserId),
    branch: String(row.branchId),
    instructor: String(row.instructorUserId),
    theoryRequest: String(row.id),
  });
  if (row.selectedThemes.length > 0) {
    p.set("themes", row.selectedThemes.map((t) => encodeURIComponent(t)).join(","));
  }
  return `/admin/bookings?${p.toString()}`;
}

export function parseThemesFromBookingSearch(themesParam: string): string[] {
  if (!themesParam.trim()) return [];
  return themesParam
    .split(",")
    .map((part) => {
      try {
        return decodeURIComponent(part.trim());
      } catch {
        return part.trim();
      }
    })
    .filter((t) => t.length > 0);
}
