import type { Metadata } from "next";
import Packages from "src/pages/public/Packages";
import { buildRouteMetadata, getRequestSeoLang } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getRequestSeoLang();
  return buildRouteMetadata("/packages", lang);
}

export default function Page() {
  return <Packages />;
}
