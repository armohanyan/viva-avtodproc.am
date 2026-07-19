/** Normalize optional phone strings and split dual numbers from a single cell. */

function cleanPhonePart(raw: string): string {
  return String(raw ?? '')
    .replace(/^[^\d+]+/u, '')
    .replace(/[^\d+\s()-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncatePhone(value: string | null): string | null {
  if (!value) return null;
  return value.length > 64 ? value.slice(0, 64) : value;
}

function splitSpaceSeparatedPhones(s: string): { phone: string; phone2: string } | null {
  // Two compact numbers in one cell, e.g. `055912772 055665165` (not slash-separated).
  const digitChunks = [...s.matchAll(/\d{7,}/g)].map((m) => m[0]!);
  if (digitChunks.length < 2) return null;
  return { phone: digitChunks[0]!, phone2: digitChunks[1]! };
}

/**
 * Parse primary + optional secondary student phones.
 * Supports an explicit second value, or dual numbers in one string
 * (e.g. `44488788/55850885`, `055912772 055665165`).
 */
export function parseStudentPhones(
  raw?: string | null,
  raw2?: string | null,
): { phone: string | null; phone2: string | null } {
  const explicit2 = cleanPhonePart(String(raw2 ?? ''));
  const trimmed = String(raw ?? '').trim();

  if (!trimmed && !explicit2) {
    return { phone: null, phone2: null };
  }

  if (explicit2) {
    return {
      phone: truncatePhone(cleanPhonePart(trimmed) || null),
      phone2: truncatePhone(explicit2),
    };
  }

  const parts = trimmed
    .split(/[/|;]+/)
    .map((p) => cleanPhonePart(p))
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      phone: truncatePhone(parts[0]!),
      phone2: truncatePhone(parts[1]!),
    };
  }

  const single = parts[0] ?? cleanPhonePart(trimmed);
  const dual = single ? splitSpaceSeparatedPhones(single) : null;
  if (dual) {
    return {
      phone: truncatePhone(dual.phone),
      phone2: truncatePhone(dual.phone2),
    };
  }

  return { phone: truncatePhone(single || null), phone2: null };
}

/** Empty string → null; otherwise trim (and truncate to DB column length). */
export function normalizeOptionalPhone(raw?: string | null): string | null {
  if (raw === undefined || raw === null) return null;
  const cleaned = cleanPhonePart(String(raw));
  return truncatePhone(cleaned || null);
}

/** Digits-only form for comparing phones (`094 061 330` ≈ `94061330`). */
export function phoneDigits(raw?: string | null): string {
  return String(raw ?? '').replace(/\D/g, '');
}

/** True when any phone on A overlaps any phone on B (7+ digit numbers). */
export function studentPhonesOverlap(
  a: { phone?: string | null; phone2?: string | null },
  b: { phone?: string | null; phone2?: string | null },
): boolean {
  const toSet = (p?: string | null, p2?: string | null): string[] =>
    [phoneDigits(p), phoneDigits(p2)].filter((d) => d.length >= 7);
  const left = toSet(a.phone, a.phone2);
  const right = toSet(b.phone, b.phone2);
  if (left.length === 0 || right.length === 0) return false;
  return left.some((d) => right.includes(d));
}

/** Stable cache / dedupe key: name + sorted phone digits. */
export function studentIdentityKey(
  name: string,
  phone?: string | null,
  phone2?: string | null,
): string {
  const digits = [phoneDigits(phone), phoneDigits(phone2)]
    .filter((d) => d.length >= 7)
    .sort();
  return `${name.trim().toLowerCase()}|${digits.join('|')}`;
}

/** Join phones for compact display / search haystacks. */
export function formatStudentPhones(
  phone?: string | null,
  phone2?: string | null,
): string {
  const a = (phone ?? '').trim();
  const b = (phone2 ?? '').trim();
  if (a && b) return `${a} / ${b}`;
  return a || b || '';
}
