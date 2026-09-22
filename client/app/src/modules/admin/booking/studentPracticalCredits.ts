import { vivaApiJson } from "src/lib/vivaApi";

export type StudentPracticalCreditsSummary = {
  /** Remaining practical hours across active package orders (+ extras). */
  practicalRemaining: number;
  /** Remaining on package balances only (can be consumed via `consumePackageCredits`). */
  packagePracticalRemaining: number;
  /** Best package label for UI (highest remaining, then newest). */
  packageName: string | null;
  /** True when package credits can cover `slotCount` hours without cash payment. */
  coversPayment: boolean;
};

type EntitlementsPayload = {
  packages?: Array<{
    packageName?: string;
    status?: string;
    practicalTotal?: number;
    practicalUsed?: number;
    practicalRemaining?: number;
  }>;
  extras?: Array<{
    practicalTotal?: number;
    practicalUsed?: number;
  }>;
};

const ACTIVE_PACKAGE_STATUSES = new Set(["active", "paid", "confirmed"]);

function packagePracticalRemaining(p: NonNullable<EntitlementsPayload["packages"]>[number]): number {
  if (p.practicalRemaining != null && Number.isFinite(Number(p.practicalRemaining))) {
    return Math.max(0, Math.floor(Number(p.practicalRemaining)));
  }
  return Math.max(0, Math.floor(Number(p.practicalTotal ?? 0) - Number(p.practicalUsed ?? 0)));
}

function extraPracticalRemaining(e: NonNullable<EntitlementsPayload["extras"]>[number]): number {
  return Math.max(0, Math.floor(Number(e.practicalTotal ?? 0) - Number(e.practicalUsed ?? 0)));
}

/** Sum practical credits from entitlements; optionally check coverage for `slotCount` hours. */
export function summarizeStudentPracticalCredits(
  data: EntitlementsPayload | null | undefined,
  slotCount = 1,
): StudentPracticalCreditsSummary {
  const pkgs = Array.isArray(data?.packages) ? data.packages : [];
  const extras = Array.isArray(data?.extras) ? data.extras : [];
  const activePkgs = pkgs.filter((p) => ACTIVE_PACKAGE_STATUSES.has(String(p.status ?? "").toLowerCase()));

  let packagePracticalRemainingTotal = 0;
  let packageName: string | null = null;
  let bestRemaining = -1;
  for (const p of activePkgs) {
    const rem = packagePracticalRemaining(p);
    packagePracticalRemainingTotal += rem;
    const name = String(p.packageName ?? "").trim();
    if (rem > bestRemaining && name) {
      bestRemaining = rem;
      packageName = name;
    }
  }

  const extrasRemaining = extras.reduce((sum, e) => sum + extraPracticalRemaining(e), 0);
  const practicalRemaining = packagePracticalRemainingTotal + extrasRemaining;
  const need = Math.max(1, Math.floor(slotCount) || 1);
  const coversPayment = packagePracticalRemainingTotal >= need;

  return {
    practicalRemaining,
    packagePracticalRemaining: packagePracticalRemainingTotal,
    packageName,
    coversPayment,
  };
}

export async function fetchStudentPracticalCredits(
  studentId: string | number,
  slotCount = 1,
): Promise<StudentPracticalCreditsSummary> {
  const id = String(studentId ?? "").trim();
  if (!id || id === "0") {
    return {
      practicalRemaining: 0,
      packagePracticalRemaining: 0,
      packageName: null,
      coversPayment: false,
    };
  }
  const data = await vivaApiJson<EntitlementsPayload>(
    `/students/${encodeURIComponent(id)}/entitlements`,
  );
  return summarizeStudentPracticalCredits(data, slotCount);
}
