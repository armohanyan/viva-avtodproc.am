import type { Metadata } from "next";
import PaymentsAndRefunds from "src/pages/public/PaymentsAndRefunds";
import { getRequestSeoLang, legalMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getRequestSeoLang();
  return legalMetadata("payments", lang, "/payments-and-refunds");
}

export default function Page() {
  return <PaymentsAndRefunds />;
}
