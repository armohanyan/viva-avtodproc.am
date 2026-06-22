import { useLang } from "../lib/i18n";
import { useAppNavigation } from "src/lib/navigation/AppNavigationContext";
import { useMarketingPublic } from "src/modules/marketing/useMarketingPublic";
import { Phone, Mail, MapPin } from "lucide-react";
import { legalDoc } from "src/lib/legalDocsContent";
import { MarketingSocialLinks, hasMarketingSocialLinks } from "src/components/MarketingSocialLinks";
import { AcbaPaymentAcceptanceMarks } from "src/components/payments/AcbaPaymentAcceptanceMarks";

export default function Footer() {
  const { t, lang } = useLang();
  const { MarketingLink } = useAppNavigation();
  const { data: mkt } = useMarketingPublic();

  const footerPhone = mkt?.contact?.phones?.[0]?.trim();
  const footerEmail = mkt?.contact?.emails?.[0]?.trim();
  const addr1 = mkt?.footer?.addressLine1?.trim();
  const addr2 = mkt?.footer?.addressLine2?.trim();
  const hasFooterContact = !!(footerPhone || footerEmail || addr1 || addr2);
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
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo.svg" alt={t("brandName")} className="w-9 h-9 object-contain" />
            </div>
            <p className="text-sm text-hero-foreground/80 leading-relaxed mb-4">{t("aboutSub")}</p>
            <p className="text-xs text-hero-foreground/70 leading-relaxed">{t("footerLegalEntity")}</p>
            {addr1 || addr2 ? (
              <p className="text-xs text-hero-foreground/60 leading-relaxed mt-1">
                {addr1 ? <span>{addr1}</span> : null}
                {addr1 && addr2 ? <br /> : null}
                {addr2 ? <span>{addr2}</span> : null}
              </p>
            ) : null}
            {showSocial ? <MarketingSocialLinks social={mkt?.social} className="mt-5" variant="footer" /> : null}
          </div>

          <div>
            <h4 className="font-semibold text-hero-foreground mb-4">{t("quickLinks")}</h4>
            <ul className="space-y-2">
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
                {addr1 || addr2 ? (
                  <li className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                    <span>
                      {addr1 ? <>{addr1}</> : null}
                      {addr1 && addr2 ? <br /> : null}
                      {addr2 ? <>{addr2}</> : null}
                    </span>
                  </li>
                ) : null}
                {footerPhone ? (
                  <li className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-primary shrink-0" />
                    <span>{footerPhone}</span>
                  </li>
                ) : null}
                {footerEmail ? (
                  <li className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-primary shrink-0" />
                    <span>{footerEmail}</span>
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
