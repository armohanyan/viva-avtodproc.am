import type { Metadata } from "next";
import Blogs from "src/views/public/Blogs";
import { buildRouteMetadata, getRequestSeoLang } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getRequestSeoLang();
  return buildRouteMetadata("/blogs", lang);
}

export default function Page() {
  return <Blogs />;
}
