import type { Metadata } from "next";
import Instructors from "src/pages/public/Instructors";
import { buildRouteMetadata, getRequestSeoLang } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getRequestSeoLang();
  return buildRouteMetadata("/instructors", lang);
}

export default function Page() {
  return <Instructors />;
}
