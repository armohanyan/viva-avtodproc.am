import type { Metadata } from "next";
import "./globals.css";
import { JsonLd } from "@/components/JsonLd";
import { MarketingProviders } from "@/components/MarketingProviders";
import { ScrollToTopOnRoute } from "@/components/ScrollToTopOnRoute";
import { buildSiteJsonLd } from "@/lib/jsonLd";
import { baseLayoutMetadata, getRequestSeoLang, htmlLangFromSeoLang } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getRequestSeoLang();
  return baseLayoutMetadata(lang);
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await getRequestSeoLang();
  return (
    <html lang={htmlLangFromSeoLang(lang)} suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background text-foreground">
        <JsonLd data={buildSiteJsonLd(lang)} />
        <MarketingProviders>
          <ScrollToTopOnRoute />
          {children}
        </MarketingProviders>
      </body>
    </html>
  );
}
