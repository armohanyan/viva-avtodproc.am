import type { Metadata } from "next";
import Home from "src/views/public/Home";
import { buildRouteMetadata } from "@/lib/seo";

export const metadata: Metadata = buildRouteMetadata("/");

export default function Page() {
  return <Home />;
}
