import type { Metadata } from "next";
import ExamTests from "src/views/public/ExamTests";
import { buildRouteMetadata } from "@/lib/seo";

export const metadata: Metadata = buildRouteMetadata("/thematic-questions");

export default function Page() {
  return <ExamTests />;
}
