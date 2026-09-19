import type { Metadata } from "next";
import PrivacyPolicy from "src/views/public/PrivacyPolicy";
import { CRAWL_SEO_LANG, legalMetadata } from "@/lib/seo";

export const metadata: Metadata = legalMetadata("privacy", CRAWL_SEO_LANG, "/privacy");

export default function Page() {
  return <PrivacyPolicy />;
}
