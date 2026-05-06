import type { Metadata } from "next";
import PrivacyPolicy from "src/pages/public/PrivacyPolicy";
import { getRequestSeoLang, legalMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getRequestSeoLang();
  return legalMetadata("privacy", lang, "/privacy");
}

export default function Page() {
  return <PrivacyPolicy />;
}
