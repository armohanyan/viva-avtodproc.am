import type { Metadata } from "next";
import { preload } from "react-dom";
import Home from "src/views/public/Home";
import { API_V1_PREFIX } from "src/constants/api.constants";
import { getApiBaseUrl } from "src/lib/apiBaseUrl";
import { sameOriginStaffUploadUrl } from "src/lib/sameOriginStaffUploadUrl";
import { buildRouteMetadata } from "@/lib/seo";

export const metadata: Metadata = buildRouteMetadata("/");

async function loadInitialHeroImage(): Promise<string | null | undefined> {
  try {
    const res = await fetch(`${getApiBaseUrl()}${API_V1_PREFIX}/marketing/public`, {
      cache: "no-store",
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as {
      siteContent?: { homeHeroBackgroundImage?: string | null };
    };
    return data.siteContent?.homeHeroBackgroundImage ?? "";
  } catch {
    return undefined;
  }
}

export default async function Page() {
  const initialHeroImage = await loadInitialHeroImage();
  const preloadUrl =
    initialHeroImage != null && initialHeroImage !== ""
      ? sameOriginStaffUploadUrl(initialHeroImage)
      : null;
  if (preloadUrl) {
    preload(preloadUrl, { as: "image", fetchPriority: "high" });
  }
  return <Home initialHeroImage={initialHeroImage} />;
}
