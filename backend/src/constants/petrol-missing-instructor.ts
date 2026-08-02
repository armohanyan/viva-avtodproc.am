/** Display / Excel label when a consumption row has no instructor linked. */
export const MISSING_INSTRUCTOR_LABEL = 'հրահանգիչ բացակա';

export function isMissingInstructorLabel(name: string | null | undefined): boolean {
  const text = (name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!text) return true;
  return text === MISSING_INSTRUCTOR_LABEL.toLowerCase();
}
