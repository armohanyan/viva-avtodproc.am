"use client";

import type { ReactElement } from "react";
import { useLang } from "src/lib/i18n";
import { legalDoc } from "src/lib/legalDocsContent";
import { LegalPageShell } from "src/views/public/LegalPageShell";

export default function TermsOfService(): ReactElement {
  const { lang } = useLang();
  return <LegalPageShell doc={legalDoc("terms", lang)} />;
}
