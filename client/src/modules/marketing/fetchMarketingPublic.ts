import { API_V1_PREFIX } from "src/constants/api";
import { apiJson } from "src/lib/api";
import type { MarketingPublicDto } from "./types";

export async function fetchMarketingPublic(): Promise<MarketingPublicDto> {
  return apiJson<MarketingPublicDto>(`${API_V1_PREFIX}/marketing/public`);
}
