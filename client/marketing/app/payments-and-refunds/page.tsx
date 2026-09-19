import type { Metadata } from "next";
import PaymentsAndRefunds from "src/views/public/PaymentsAndRefunds";
import { CRAWL_SEO_LANG, legalMetadata } from "@/lib/seo";

export const metadata: Metadata = legalMetadata("payments", CRAWL_SEO_LANG, "/payments-and-refunds");

export default function Page() {
  return <PaymentsAndRefunds />;
}
