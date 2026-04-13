import type { Metadata } from "next";
import "./globals.css";
import { MarketingProviders } from "@/components/MarketingProviders";
import { ScrollToTopOnRoute } from "@/components/ScrollToTopOnRoute";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: "Viva Autoschool",
    template: "%s | Viva Autoschool",
  },
  description:
    "Driving lessons and theory courses in Armenia. Certified instructors, flexible scheduling, and license exam preparation at Viva Autoschool.",
  openGraph: {
    type: "website",
    siteName: "Viva Autoschool",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background text-foreground">
        <MarketingProviders>
          <ScrollToTopOnRoute />
          {children}
        </MarketingProviders>
      </body>
    </html>
  );
}
