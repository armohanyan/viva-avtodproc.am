import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { TranslationKey } from "src/lib/i18n";

export type PackageTierId = "basic" | "standard" | "premium";

export type CatalogPackage = {
  id: PackageTierId;
  nameKey: TranslationKey;
  priceDisplay: string;
  practicalLessons: number;
  theorySessions: number;
};

/** Mirrors public pricing; theory + exam/thematic access are included with every tier. */
export const STUDENT_PACKAGE_CATALOG: readonly CatalogPackage[] = [
  {
    id: "basic",
    nameKey: "basic",
    priceDisplay: "35,000 ֏",
    practicalLessons: 10,
    theorySessions: 8,
  },
  {
    id: "standard",
    nameKey: "standard",
    priceDisplay: "55,000 ֏",
    practicalLessons: 18,
    theorySessions: 12,
  },
  {
    id: "premium",
    nameKey: "premium",
    priceDisplay: "85,000 ֏",
    practicalLessons: 28,
    theorySessions: 16,
  },
] as const;

export const EXTRA_PRACTICAL_BLOCK = {
  lessons: 3,
  priceDisplay: "12,000 ֏",
  nameKey: "demoExtraPracticalBlockName" as TranslationKey,
};

export type OwnedPackage = {
  purchaseId: string;
  tier: PackageTierId;
  purchasedAt: string;
  practicalTotal: number;
  practicalUsed: number;
  theorySessions: number;
};

export type OwnedExtraPractical = {
  id: string;
  purchasedAt: string;
  practicalTotal: number;
  practicalUsed: number;
  priceDisplay: string;
};

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function paymentDescForTier(tier: PackageTierId): TranslationKey {
  switch (tier) {
    case "basic":
      return "paymentDescBasicPackage";
    case "standard":
      return "paymentDescStandardPackage";
    case "premium":
      return "paymentDescPremiumPackage";
  }
}

type StudentEntitlementsContextValue = {
  ownedPackages: readonly OwnedPackage[];
  extraPracticalBlocks: readonly OwnedExtraPractical[];
  /** Sum of remaining practical credits (package + extra blocks). */
  practicalCreditsRemaining: number;
  packagePracticalRemaining: number;
  extraPracticalRemaining: number;
  hasTheoryFromPackage: boolean;
  primaryTheorySessions: number;
  completedPracticalLessons: number;
  upcomingBookingsCount: number;
  purchasePackage: (tier: PackageTierId) => void;
  purchaseExtraPracticalBlock: () => void;
};

const StudentEntitlementsContext = createContext<StudentEntitlementsContextValue | null>(null);

const initialPackages: OwnedPackage[] = [
  {
    purchaseId: "PKG-001",
    tier: "standard",
    purchasedAt: "2026-03-01",
    practicalTotal: 18,
    practicalUsed: 4,
    theorySessions: 12,
  },
];

const initialExtras: OwnedExtraPractical[] = [
  {
    id: "PL-001",
    purchasedAt: "2026-03-15",
    practicalTotal: 3,
    practicalUsed: 1,
    priceDisplay: "12,000 ֏",
  },
];

export function StudentEntitlementsProvider({ children }: { children: ReactNode }) {
  const [ownedPackages, setOwnedPackages] = useState<OwnedPackage[]>(initialPackages);
  const [extraPracticalBlocks, setExtraPracticalBlocks] = useState<OwnedExtraPractical[]>(initialExtras);

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
    return {
      packagePracticalRemaining: pkgRem,
      extraPracticalRemaining: exRem,
      practicalCreditsRemaining: pkgRem + exRem,
      hasTheoryFromPackage: ownedPackages.length > 0,
      primaryTheorySessions: primary?.theorySessions ?? 0,
      completedPracticalLessons: pkgUsed + extraPracticalBlocks.reduce((a, e) => a + e.practicalUsed, 0),
      upcomingBookingsCount: 3,
    };
  }, [ownedPackages, extraPracticalBlocks]);

  const purchasePackage = useCallback((tier: PackageTierId) => {
    const def = STUDENT_PACKAGE_CATALOG.find((p) => p.id === tier);
    if (!def) return;
    const row: OwnedPackage = {
      purchaseId: newId("PKG"),
      tier,
      purchasedAt: todayIso(),
      practicalTotal: def.practicalLessons,
      practicalUsed: 0,
      theorySessions: def.theorySessions,
    };
    setOwnedPackages((prev) => [...prev, row]);
  }, []);

  const purchaseExtraPracticalBlock = useCallback(() => {
    const row: OwnedExtraPractical = {
      id: newId("PL"),
      purchasedAt: todayIso(),
      practicalTotal: EXTRA_PRACTICAL_BLOCK.lessons,
      practicalUsed: 0,
      priceDisplay: EXTRA_PRACTICAL_BLOCK.priceDisplay,
    };
    setExtraPracticalBlocks((prev) => [...prev, row]);
  }, []);

  const value = useMemo(
    () =>
      ({
        ownedPackages,
        extraPracticalBlocks,
        practicalCreditsRemaining: aggregates.practicalCreditsRemaining,
        packagePracticalRemaining: aggregates.packagePracticalRemaining,
        extraPracticalRemaining: aggregates.extraPracticalRemaining,
        hasTheoryFromPackage: aggregates.hasTheoryFromPackage,
        primaryTheorySessions: aggregates.primaryTheorySessions,
        completedPracticalLessons: aggregates.completedPracticalLessons,
        upcomingBookingsCount: aggregates.upcomingBookingsCount,
        purchasePackage,
        purchaseExtraPracticalBlock,
      }) satisfies StudentEntitlementsContextValue,
    [ownedPackages, extraPracticalBlocks, aggregates, purchasePackage, purchaseExtraPracticalBlock],
  );

  return (
    <StudentEntitlementsContext.Provider value={value}>{children}</StudentEntitlementsContext.Provider>
  );
}

export function useStudentEntitlements(): StudentEntitlementsContextValue {
  const ctx = useContext(StudentEntitlementsContext);
  if (!ctx) {
    throw new Error("useStudentEntitlements must be used within StudentEntitlementsProvider");
  }
  return ctx;
}

export function getCatalogPackage(tier: PackageTierId): CatalogPackage | undefined {
  return STUDENT_PACKAGE_CATALOG.find((p) => p.id === tier);
}
