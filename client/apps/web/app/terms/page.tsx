import type { Metadata } from "next";
import TermsOfService from "src/pages/public/TermsOfService";
import { LEGAL_DOCS } from "src/lib/legalDocsContent";

export const metadata: Metadata = {
  title: LEGAL_DOCS.terms.en.pageTitle,
  description: LEGAL_DOCS.terms.en.metaDescription,
};

export default function Page() {
  return <TermsOfService />;
}
