import type { Metadata } from "next";
import RoadSigns from "src/views/public/RoadSigns";
import { buildRouteMetadata } from "@/lib/seo";

export const metadata: Metadata = buildRouteMetadata("/road-signs");

export default function Page() {
  return <RoadSigns />;
}
