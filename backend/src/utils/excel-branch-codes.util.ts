/**
 * Excel "Branch" column codes used when an instructor serves multiple branches.
 * Cell values 1–4 map to these branch address lines (`branches.name`).
 */
export const EXCEL_BRANCH_CODE_ADDRESSES: Readonly<Record<string, string>> = {
  "1": "Ազատամարտիկների 75",
  "2": "Գարեգին Նժդեհ 8",
  "3": "Երևանյան 125",
  "4": "Իսակովի 99Ա",
};

/** Normalize Excel branch cells (`1`, `1.0`, spaces). */
export function normalizeExcelBranchCell(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  if (/^\d+(\.0+)?$/.test(trimmed)) {
    return String(Number.parseInt(trimmed, 10));
  }
  return trimmed;
}

export type BranchRef = { id: number | string; name: string };

/**
 * Resolve an Excel Branch cell to a branch.
 * Accepts numeric id/code (1–4), known address text, or existing name match.
 */
export function matchBranchFromExcelCell<T extends BranchRef>(
  branchCell: string,
  branches: readonly T[],
): { branch: T } | { error: string } {
  const needle = normalizeExcelBranchCell(branchCell);
  if (!needle) return { error: "Empty branch" };

  if (/^\d+$/.test(needle)) {
    const id = Number(needle);
    const byId = branches.find((b) => Number(b.id) === id);
    if (byId) return { branch: byId };

    const address = EXCEL_BRANCH_CODE_ADDRESSES[needle];
    if (address) {
      const byAddress = matchByAddress(address, branches);
      if (byAddress) return { branch: byAddress };
      return { error: `Branch code ${needle} ("${address}") not found` };
    }
    return { error: `Branch id ${needle} not found` };
  }

  const addressFromCode = Object.values(EXCEL_BRANCH_CODE_ADDRESSES).find(
    (addr) => addr === needle || needle.includes(addr) || addr.includes(needle),
  );
  if (addressFromCode) {
    const byAddress = matchByAddress(addressFromCode, branches);
    if (byAddress) return { branch: byAddress };
  }

  const exact = branches.find((b) => b.name.trim() === needle);
  if (exact) return { branch: exact };

  const lower = needle.toLowerCase();
  const ciExact = branches.filter((b) => b.name.trim().toLowerCase() === lower);
  if (ciExact.length === 1) return { branch: ciExact[0]! };
  if (ciExact.length > 1) {
    return {
      error: `Ambiguous branch "${needle}" (matches: ${ciExact.map((b) => b.name).join(", ")})`,
    };
  }

  const contains = branches.filter((b) => {
    const name = b.name.trim().toLowerCase();
    return name.includes(lower) || lower.includes(name);
  });
  if (contains.length === 1) return { branch: contains[0]! };
  if (contains.length > 1) {
    return {
      error: `Ambiguous branch "${needle}" (candidates: ${contains.map((b) => b.name).join(", ")})`,
    };
  }

  return { error: `Branch not found: "${needle}"` };
}

function matchByAddress<T extends BranchRef>(address: string, branches: readonly T[]): T | null {
  const exact = branches.find((b) => b.name.trim() === address);
  if (exact) return exact;
  const contains = branches.filter((b) => {
    const name = b.name.trim();
    return name.includes(address) || address.includes(name);
  });
  return contains.length === 1 ? contains[0]! : null;
}
