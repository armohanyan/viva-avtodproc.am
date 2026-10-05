import { Suspense } from "react";
import type { Metadata } from "next";
import RoadSignsStudyPage from "src/views/public/RoadSignsStudyPage";
import { buildRouteMetadata } from "@/lib/seo";

export const metadata: Metadata = buildRouteMetadata("/road-signs");

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RoadSignsStudyPage />
    </Suspense>
  );
}
