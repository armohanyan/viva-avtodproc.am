import { useCallback, useEffect, useState } from "react";
import { fetchMarketingPublic } from "./fetchMarketingPublic";
import type { MarketingPublicDto } from "./types";

export function useMarketingPublic() {
  const [data, setData] = useState<MarketingPublicDto | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const d = await fetchMarketingPublic();
      setData(d);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, refresh };
}
