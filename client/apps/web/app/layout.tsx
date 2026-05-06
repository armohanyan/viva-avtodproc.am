import type { Metadata } from "next";
import "./globals.css";
import { MarketingProviders } from "@/components/MarketingProviders";
import { ScrollToTopOnRoute } from "@/components/ScrollToTopOnRoute";
import { baseLayoutMetadata, getRequestSeoLang } from "@/lib/seo";

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
    <html lang={lang} suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background text-foreground">
        <MarketingProviders>
          <ScrollToTopOnRoute />
          {children}
        </MarketingProviders>
      </body>
    </html>
  );
}
