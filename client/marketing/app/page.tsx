import type { Metadata } from "next";
import Home from "src/views/public/Home";
import { buildRouteMetadata, getRequestSeoLang } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getRequestSeoLang();
  return buildRouteMetadata("/", lang);
}

export default function Page() {
  return <Home />;
}
