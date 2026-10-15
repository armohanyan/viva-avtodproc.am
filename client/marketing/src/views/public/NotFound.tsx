"use client";

import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import { buttonVariants } from "src/components/ui/button";
import { useLang } from "src/lib/i18n";
import { useAppNavigation } from "src/lib/navigation/AppNavigationContext";
import { cn } from "src/lib/utils";

export default function NotFoundPage() {
  const { t } = useLang();
  const { MarketingLink, panelHref } = useAppNavigation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex items-center">
        <div className="max-w-xl mx-auto w-full px-4 sm:px-6 py-16 sm:py-24 text-center">
          <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-3">{t("notFoundCode")}</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">{t("notFoundTitle")}</h1>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed mb-8">{t("notFoundDescription")}</p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <MarketingLink
              href="/"
              className={cn(
                buttonVariants({ size: "lg" }),
                "w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground",
              )}
            >
              {t("notFoundGoHome")}
            </MarketingLink>
            <a
              href={panelHref("/login")}
              className={cn(buttonVariants({ size: "lg", variant: "outline" }), "w-full sm:w-auto")}
            >
              {t("notFoundSignIn")}
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
