import type { Metadata } from "next";
import RoadSigns from "src/views/public/RoadSigns";
import { buildRouteMetadata, getRequestSeoLang } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getRequestSeoLang();
  return buildRouteMetadata("/road-signs", lang);
}

export default function Page() {
  return <RoadSigns />;
}
