import type { Metadata } from "next";
import ExamTests from "src/views/public/ExamTests";
import { buildRouteMetadata } from "@/lib/seo";

export const metadata: Metadata = buildRouteMetadata("/exam-tests");

export default function Page() {
  return <ExamTests />;
}
