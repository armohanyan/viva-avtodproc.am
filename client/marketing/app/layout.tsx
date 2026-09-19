import type { Metadata } from "next";
import "./globals.css";
import { JsonLd } from "@/components/JsonLd";
import { MarketingProviders } from "@/components/MarketingProviders";
import { ScrollToTopOnRoute } from "@/components/ScrollToTopOnRoute";
import { buildSiteJsonLd } from "@/lib/jsonLd";
import { baseLayoutMetadata, CRAWL_SEO_LANG, htmlLangFromSeoLang } from "@/lib/seo";

/**
 * Static metadata so title/description/canonical land in `<head>` for crawlers.
 * Cookie-based `generateMetadata` streamed those tags after `</head>` and killed SEO.
 */
export const metadata: Metadata = baseLayoutMetadata(CRAWL_SEO_LANG);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={htmlLangFromSeoLang(CRAWL_SEO_LANG)} suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background text-foreground">
        <JsonLd data={buildSiteJsonLd(CRAWL_SEO_LANG)} />
        <MarketingProviders>
          <ScrollToTopOnRoute />
          {children}
        </MarketingProviders>
      </body>
    </html>
  );
}
