import type { Metadata } from "next";
import TermsOfService from "src/views/public/TermsOfService";
import { getRequestSeoLang, legalMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getRequestSeoLang();
  return legalMetadata("terms", lang, "/terms");
}

export default function Page() {
  return <TermsOfService />;
}
