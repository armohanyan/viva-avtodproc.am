import type { Metadata } from "next";
import ExamTests from "src/views/public/ExamTests";
import { buildRouteMetadata, getRequestSeoLang } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getRequestSeoLang();
  return buildRouteMetadata("/thematic-questions", lang);
}

export default function Page() {
  return <ExamTests />;
}
