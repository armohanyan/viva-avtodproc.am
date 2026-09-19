import type { Metadata } from "next";
import Packages from "src/views/public/Packages";
import { buildRouteMetadata } from "@/lib/seo";

export const metadata: Metadata = buildRouteMetadata("/packages");

export default function Page() {
  return <Packages />;
}
