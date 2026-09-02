import type { Branch } from "./branch.types";

/**
 * Minimal branch label from the live branch name: first letter(s) of word(s) + trailing number.
 * One-word names keep a space before the number; multi-word names concatenate lowercase initials.
 */
export function branchMinimalLabel(name: string): string {
  const raw = String(name ?? "").normalize("NFC").trim();
  if (!raw) return "";
  const m = raw.match(/^(.*?)\s+(\d\S*)$/u);
  const textPart = (m?.[1] ?? raw).trim();
  const numPart = m?.[2] ?? "";
  const words = textPart.split(/\s+/).filter(Boolean);
  const initials = words
    .map((w) => {
      const letters = Array.from(w).filter((ch) => /\p{L}/u.test(ch));
      return letters[0] ?? "";
    })
    .filter(Boolean);
  if (initials.length === 0) return numPart || raw;
  if (initials.length === 1) {
    return numPart ? `${initials[0]} ${numPart}` : initials[0]!;
  }
  const compact = initials.join("").toLocaleLowerCase("hy");
  return numPart ? `${compact}${numPart}` : compact;
}

/** Prefer the stored branch label; fall back to a compact form of the address name. */
export function branchDisplayLabel(branch: Pick<Branch, "name" | "label">): string {
  const label = String(branch.label ?? "").trim();
  return label || branchMinimalLabel(branch.name);
}
