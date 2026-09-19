import type { Metadata } from "next";
import About from "src/views/public/About";
import { buildRouteMetadata } from "@/lib/seo";

export const metadata: Metadata = buildRouteMetadata("/about");

export default function Page() {
  return <About />;
}
