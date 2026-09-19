import type { Metadata } from "next";
import Instructors from "src/views/public/Instructors";
import { buildRouteMetadata } from "@/lib/seo";

export const metadata: Metadata = buildRouteMetadata("/instructors");

export default function Page() {
  return <Instructors />;
}
