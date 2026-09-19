import type { Metadata } from "next";
import TermsOfService from "src/views/public/TermsOfService";
import { CRAWL_SEO_LANG, legalMetadata } from "@/lib/seo";

export const metadata: Metadata = legalMetadata("terms", CRAWL_SEO_LANG, "/terms");

export default function Page() {
  return <TermsOfService />;
}
