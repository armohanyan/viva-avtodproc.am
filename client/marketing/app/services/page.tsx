import type { Metadata } from "next";
import Services from "src/views/public/Services";
import { buildRouteMetadata } from "@/lib/seo";

export const metadata: Metadata = buildRouteMetadata("/services");

export default function Page() {
  return <Services />;
}
