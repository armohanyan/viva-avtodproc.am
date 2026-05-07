import type { Metadata } from "next";
import Services from "src/views/public/Services";
import { buildRouteMetadata, getRequestSeoLang } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getRequestSeoLang();
  return buildRouteMetadata("/services", lang);
}

export default function Page() {
  return <Services />;
}
