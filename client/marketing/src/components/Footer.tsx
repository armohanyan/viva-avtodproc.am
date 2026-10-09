import { useLang } from "../lib/i18n";
import { useAppNavigation } from "src/lib/navigation/AppNavigationContext";
import { useMarketingPublic } from "src/modules/marketing/useMarketingPublic";
import { Phone, Mail } from "lucide-react";
import { legalDoc } from "src/lib/legalDocsContent";
import { MarketingSocialLinks, hasMarketingSocialLinks } from "src/components/MarketingSocialLinks";
import { AcbaPaymentAcceptanceMarks } from "src/components/payments/AcbaPaymentAcceptanceMarks";
import BrandLogo from "src/components/BrandLogo";

export default function Footer() {
  const { t, lang } = useLang();
  const { MarketingLink } = useAppNavigation();
  const { data: mkt } = useMarketingPublic();

  const footerPhone = mkt?.contact?.phones?.[0]?.trim();
  const footerEmail =
    mkt?.contact?.emails?.[0]?.trim() ||
    mkt?.contact?.primaryMailtoHref?.trim().replace(/^mailto:/i, "") ||
    "";
  const hasFooterContact = !!(footerPhone || footerEmail);
  const showSocial = hasMarketingSocialLinks(mkt?.social);
  const privacyDoc = legalDoc("privacy", lang);
  const termsDoc = legalDoc("terms", lang);
  const paymentsDoc = legalDoc("payments", lang);

  return (
    <footer className="bg-hero text-hero-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div
          className={`grid grid-cols-1 md:grid-cols-2 gap-10 ${hasFooterContact ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}
        >
          <div>
            <div className="mb-4">
              <BrandLogo layout="horizontal" tone="on-dark" className="h-10 max-w-[14rem]" />
            </div>
            {showSocial ? <MarketingSocialLinks social={mkt?.social} className="mt-5" variant="footer" /> : null}
          </div>

          <div>
            <h4 className="font-semibold text-hero-foreground mb-4">{t("quickLinks")}</h4>
            <ul className="flex flex-wrap gap-x-5 gap-y-2.5 max-w-sm">
              {[
                { href: "/about", label: t("about") },
                { href: "/services", label: t("services") },
                { href: "/thematic-questions", label: t("examTests") },
                { href: "/packages", label: t("packages") },
                { href: "/instructors", label: t("instructors") },
                { href: "/blogs", label: t("blogs") },
                { href: "/contact", label: t("contact") },
              ].map((l) => (
                <li key={l.href}>
                  <MarketingLink
                    href={l.href}
                    className="text-sm text-hero-foreground/80 hover:text-hero-foreground transition-colors"
                  >
                    {l.label}
                  </MarketingLink>
                </li>
              ))}
            </ul>
          </div>

          {hasFooterContact ? (
            <div>
              <h4 className="font-semibold text-hero-foreground mb-4">{t("contact")}</h4>
              <ul className="space-y-3">
                {footerPhone ? (
                  <li>
                    <a
                      href={`tel:${footerPhone.replace(/[^\d+]/g, "")}`}
                      className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                    >
                      <Phone className="w-4 h-4 text-primary shrink-0" />
                      <span>{footerPhone}</span>
                    </a>
                  </li>
                ) : null}
                {footerEmail ? (
                  <li>
                    <a
                      href={`mailto:${footerEmail}`}
                      className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                    >
                      <Mail className="w-4 h-4 text-primary shrink-0" />
                      <span className="break-all">{footerEmail}</span>
                    </a>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="border-t border-border/60 mt-12 pt-8">
          <h4 className="font-semibold text-hero-foreground mb-3 text-sm">{t("vposFooterPaymentsHeading")}</h4>
          <AcbaPaymentAcceptanceMarks variant="dark" compact showHint showPolicyLink show3ds />
        </div>
      </div>

      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-hero-foreground/70">
            © 2026 {t("brandName")}. {t("allRights")}
          </p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-hero-foreground/70">
            <MarketingLink href="/privacy" className="hover:text-hero-foreground/90">
              {privacyDoc.pageTitle}
            </MarketingLink>
            <MarketingLink href="/terms" className="hover:text-hero-foreground/90">
              {termsDoc.pageTitle}
            </MarketingLink>
            <MarketingLink href="/payments-and-refunds" className="hover:text-hero-foreground/90">
              {paymentsDoc.pageTitle}
            </MarketingLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
