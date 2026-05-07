"use client";

import type { ReactElement } from "react";
import Footer from "src/components/Footer";
import Navbar from "src/components/Navbar";
import type { LegalDoc } from "src/lib/legalDocsContent";

interface Props {
  doc: LegalDoc;
}

export function LegalPageShell({ doc }: Props): ReactElement {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-16">
          <p className="text-xs text-muted-foreground mb-6">{doc.updated}</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-10">{doc.pageTitle}</h1>
          <div className="space-y-10">
            {doc.sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-semibold text-foreground mb-3">{section.title}</h2>
                <div className="space-y-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {section.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}