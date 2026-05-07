import type { Metadata } from "next";
import Contact from "src/views/public/Contact";
import { buildRouteMetadata, getRequestSeoLang } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getRequestSeoLang();
  return buildRouteMetadata("/contact", lang);
}

export default function Page() {
  return <Contact />;
}
