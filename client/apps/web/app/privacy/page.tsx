import type { Metadata } from "next";
import PrivacyPolicy from "src/pages/public/PrivacyPolicy";
import { LEGAL_DOCS } from "src/lib/legalDocsContent";

export const metadata: Metadata = {
  title: LEGAL_DOCS.privacy.en.pageTitle,
  description: LEGAL_DOCS.privacy.en.metaDescription,
};

export default function Page() {
  return <PrivacyPolicy />;
}
