/** Join optional primary + secondary student phones for compact display. */
export function formatStudentPhones(
  phone?: string | null,
  phone2?: string | null,
): string {
  const a = (phone ?? "").trim();
  const b = (phone2 ?? "").trim();
  if (a && b) return `${a} / ${b}`;
  return a || b || "";
}
