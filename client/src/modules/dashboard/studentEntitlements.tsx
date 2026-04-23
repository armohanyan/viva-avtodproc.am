import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { countUpcomingStudentBookings } from "src/data/studentDemoBookings";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useAccount } from "src/modules/accounts";
import { useStudentBookings } from "src/modules/bookings/useStudentBookings";
import type { TranslationKey } from "src/lib/i18n";

export type PackageTierId = "basic" | "standard" | "premium";

export const EXTRA_PRACTICAL_BLOCK = {
  lessons: 3,
  priceDisplay: "12,000 ֏",
  nameKey: "extraPracticalBlockName" as TranslationKey,
};

export type OwnedPackage = {
  purchaseId: number;
  tier: PackageTierId;
  purchasedAt: string;
  practicalTotal: number;
  practicalUsed: number;
  theoryTotal: number;
  theoryUsed: number;
};

export type OwnedExtraPractical = {
  id: number;
  purchasedAt: string;
  practicalTotal: number;
  practicalUsed: number;
  priceDisplay: string;
};

type EntitlementsApi = {
  packages: OwnedPackage[];
  extras: OwnedExtraPractical[];
};

type StudentEntitlementsContextValue = {
  ownedPackages: readonly OwnedPackage[];
  extraPracticalBlocks: readonly OwnedExtraPractical[];
  practicalCreditsRemaining: number;
  packagePracticalRemaining: number;
  extraPracticalRemaining: number;
  hasTheoryFromPackage: boolean;
  primaryTheoryTotal: number;
  primaryTheoryUsed: number;
  theoryLessonsRemaining: number;
  completedPracticalLessons: number;
  upcomingBookingsCount: number;
  entitlementsLoading: boolean;
  entitlementsError: string | null;
  refreshEntitlements: () => Promise<void>;
  purchasePackage: (packageId: number) => Promise<void>;
  purchaseExtraPracticalBlock: () => Promise<void>;
};

const StudentEntitlementsContext = createContext<StudentEntitlementsContextValue | null>(null);

export function StudentEntitlementsProvider({ children }: { children: ReactNode }) {
  const { user } = useAccount();
  const { bookings } = useStudentBookings(user?.accountType === "student" ? user.id : undefined);
  const [ownedPackages, setOwnedPackages] = useState<OwnedPackage[]>([]);
  const [extraPracticalBlocks, setExtraPracticalBlocks] = useState<OwnedExtraPractical[]>([]);
  const [entitlementsLoading, setEntitlementsLoading] = useState(false);
  const [entitlementsError, setEntitlementsError] = useState<string | null>(null);

  const refreshEntitlements = useCallback(async () => {
    if (!user?.id || user.accountType !== "student") {
      setOwnedPackages([]);
      setExtraPracticalBlocks([]);
      setEntitlementsError(null);
      return;
    }
    setEntitlementsLoading(true);
    setEntitlementsError(null);
    try {
      const data = await vivaApiJson<EntitlementsApi>(`/students/${encodeURIComponent(user.id)}/entitlements`);
      setOwnedPackages(
        Array.isArray(data.packages)
          ? data.packages.map((p) => {
              const raw = p as OwnedPackage & { theorySessions?: number };
              const theoryTotal = Number(raw.theoryTotal ?? raw.theorySessions ?? 0);
              const theoryUsed = Number(raw.theoryUsed ?? 0);
              return {
                purchaseId: Number(p.purchaseId),
                tier: normalizeTier(String(p.tier)),
                purchasedAt: String(p.purchasedAt),
                practicalTotal: Number(p.practicalTotal),
                practicalUsed: Number(p.practicalUsed),
                theoryTotal,
                theoryUsed,
              };
            })
          : [],
      );
      setExtraPracticalBlocks(Array.isArray(data.extras) ? data.extras.map((e) => ({ ...e, id: Number(e.id) })) : []);
    } catch (e) {
      setOwnedPackages([]);
      setExtraPracticalBlocks([]);
      setEntitlementsError(getApiErrorMessage(e));
    } finally {
      setEntitlementsLoading(false);
    }
  }, [user?.id, user?.accountType]);

  useEffect(() => {
    void refreshEntitlements();
  }, [refreshEntitlements]);

  const aggregates = useMemo(() => {
    let pkgRem = 0;
    let pkgTotal = 0;
    let pkgUsed = 0;
    for (const p of ownedPackages) {
      pkgRem += Math.max(0, p.practicalTotal - p.practicalUsed);
      pkgTotal += p.practicalTotal;
      pkgUsed += p.practicalUsed;
    }
    let exRem = 0;
    for (const e of extraPracticalBlocks) {
      exRem += Math.max(0, e.practicalTotal - e.practicalUsed);
    }
    const primary = ownedPackages[0];
    const theoryRem = primary ? Math.max(0, primary.theoryTotal - primary.theoryUsed) : 0;
    return {
      packagePracticalRemaining: pkgRem,
      extraPracticalRemaining: exRem,
      practicalCreditsRemaining: pkgRem + exRem,
      hasTheoryFromPackage: ownedPackages.some((p) => p.theoryTotal > 0),
      primaryTheoryTotal: primary?.theoryTotal ?? 0,
      primaryTheoryUsed: primary?.theoryUsed ?? 0,
      theoryLessonsRemaining: theoryRem,
      completedPracticalLessons: pkgUsed + extraPracticalBlocks.reduce((a, e) => a + e.practicalUsed, 0),
      upcomingBookingsCount: countUpcomingStudentBookings(bookings),
    };
  }, [ownedPackages, extraPracticalBlocks, bookings]);

  const purchasePackage = useCallback(
    async (packageId: number) => {
      if (!user?.id || user.accountType !== "student") return;
      await vivaApiJson<EntitlementsApi>(`/students/${encodeURIComponent(user.id)}/entitlements/package`, {
        method: "POST",
        body: { packageId },
      });
      await refreshEntitlements();
    },
    [user?.id, user?.accountType, refreshEntitlements],
  );

  const purchaseExtraPracticalBlock = useCallback(async () => {
    if (!user?.id || user.accountType !== "student") return;
    await vivaApiJson<EntitlementsApi>(`/students/${encodeURIComponent(user.id)}/entitlements/extra-practical`, {
      method: "POST",
      body: { practicalTotal: EXTRA_PRACTICAL_BLOCK.lessons },
    });
    await refreshEntitlements();
  }, [user?.id, user?.accountType, refreshEntitlements]);

  const value = useMemo(
    () =>
      ({
        ownedPackages,
        extraPracticalBlocks,
        practicalCreditsRemaining: aggregates.practicalCreditsRemaining,
        packagePracticalRemaining: aggregates.packagePracticalRemaining,
        extraPracticalRemaining: aggregates.extraPracticalRemaining,
        hasTheoryFromPackage: aggregates.hasTheoryFromPackage,
        primaryTheoryTotal: aggregates.primaryTheoryTotal,
        primaryTheoryUsed: aggregates.primaryTheoryUsed,
        theoryLessonsRemaining: aggregates.theoryLessonsRemaining,
        completedPracticalLessons: aggregates.completedPracticalLessons,
        upcomingBookingsCount: aggregates.upcomingBookingsCount,
        entitlementsLoading,
        entitlementsError,
        refreshEntitlements,
        purchasePackage,
        purchaseExtraPracticalBlock,
      }) satisfies StudentEntitlementsContextValue,
    [
      ownedPackages,
      extraPracticalBlocks,
      aggregates,
      entitlementsLoading,
      entitlementsError,
      refreshEntitlements,
      purchasePackage,
      purchaseExtraPracticalBlock,
    ],
  );

  return <StudentEntitlementsContext.Provider value={value}>{children}</StudentEntitlementsContext.Provider>;
}

export function useStudentEntitlements(): StudentEntitlementsContextValue {
  const ctx = useContext(StudentEntitlementsContext);
  if (!ctx) {
    throw new Error("useStudentEntitlements must be used within StudentEntitlementsProvider");
  }
  return ctx;
}

function normalizeTier(raw: string): PackageTierId {
  return raw === "basic" || raw === "standard" || raw === "premium" ? raw : "standard";
}
