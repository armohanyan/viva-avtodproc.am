import type { Metadata } from "next";
import About from "src/views/public/About";
import { buildRouteMetadata, getRequestSeoLang } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getRequestSeoLang();
  return buildRouteMetadata("/about", lang);
}

export default function Page() {
  return <About />;
}
