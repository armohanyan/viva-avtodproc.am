import type { Metadata } from "next";
import Contact from "src/views/public/Contact";
import { buildRouteMetadata } from "@/lib/seo";

export const metadata: Metadata = buildRouteMetadata("/contact");

export default function Page() {
  return <Contact />;
}
