import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";

export type PackageListRow = {
  id: number;
  name: string;
  price: string;
  priceAmd: number;
  lessons: number;
  theoryLessons: number;
  features: string[];
  status: string;
  imageUrl?: string | null;
};

export function useActivePackages() {
  const [packages, setPackages] = useState<PackageListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await vivaApiJson<PackageListRow[]>("/packages");
      const rows = Array.isArray(data) ? data : [];
      const active = rows
        .filter((p) => String(p.status ?? "").toLowerCase() === "active")
        .map((p) => {
          const r = p as PackageListRow;
          return {
            ...p,
            theoryLessons: Number(r.theoryLessons ?? 0),
            priceAmd: Math.max(0, Number(r.priceAmd ?? 0)),
          };
        });
      setPackages(active);
    } catch (e) {
      setPackages([]);
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { packages, loading, error, refresh };
}
