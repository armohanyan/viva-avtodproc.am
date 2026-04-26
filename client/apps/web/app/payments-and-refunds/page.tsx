import type { Metadata } from "next";
import PaymentsAndRefunds from "src/pages/public/PaymentsAndRefunds";
import { LEGAL_DOCS } from "src/lib/legalDocsContent";

export const metadata: Metadata = {
  title: LEGAL_DOCS.payments.en.pageTitle,
  description: LEGAL_DOCS.payments.en.metaDescription,
};

export default function Page() {
  return <PaymentsAndRefunds />;
}
