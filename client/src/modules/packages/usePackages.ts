import { useCallback, useEffect, useState } from "react";
import { vivaApiJson } from "src/lib/vivaApi";

export type MarketingPackageRow = {
  id: string;
  name: string;
  price: string;
  lessons: number;
  status: string;
  features: string[];
  imageUrl: string | null;
};

export function usePackages() {
  const [packages, setPackages] = useState<MarketingPackageRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await vivaApiJson<MarketingPackageRow[]>("/packages");
      if (!Array.isArray(data)) {
        setPackages([]);
        return;
      }
      setPackages(
        data
          .filter((p) => (p.status ?? "active") === "active")
          .map((p) => ({
            ...p,
            imageUrl: p.imageUrl ?? null,
            features: Array.isArray(p.features) ? p.features : [],
          })),
      );
    } catch {
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { packages, loading, refresh };
}
