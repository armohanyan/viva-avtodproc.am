import type { Metadata } from "next";
import Instructors from "src/views/public/Instructors";
import { buildRouteMetadata } from "@/lib/seo";

export const metadata: Metadata = buildRouteMetadata("/instructors");

type Search = { city?: string; region?: string };

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  return <Instructors initialCity={params.city ?? ""} initialRegion={params.region ?? ""} />;
}
