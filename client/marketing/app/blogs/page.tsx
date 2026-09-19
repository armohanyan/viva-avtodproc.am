import type { Metadata } from "next";
import Blogs from "src/views/public/Blogs";
import { buildRouteMetadata } from "@/lib/seo";

export const metadata: Metadata = buildRouteMetadata("/blogs");

export default function Page() {
  return <Blogs />;
}
