import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import { useLang } from "src/lib/i18n";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "src/components/ui/button";
import { Badge } from "src/components/ui/badge";
import { Link } from "wouter";
import { CountUpText, Reveal } from "src/lib/motion";

type Tier = {
  nameKey: "basic" | "standard" | "premium";
  price: string;
  practical: number;
  theory: number;
  popular: boolean;
  priorityBooking: boolean;
  instructorChoice: boolean;
  premiumCert: boolean;
};

const TIERS: Tier[] = [
  {
    nameKey: "basic",
    price: "35,000",
    practical: 10,
    theory: 8,
    popular: false,
    priorityBooking: false,
    instructorChoice: false,
    premiumCert: false,
  },
  {
    nameKey: "standard",
    price: "55,000",
    practical: 18,
    theory: 12,
    popular: true,
    priorityBooking: false,
    instructorChoice: true,
    premiumCert: false,
  },
  {
    nameKey: "premium",
    price: "85,000",
    practical: 28,
    theory: 16,
    popular: false,
    priorityBooking: true,
    instructorChoice: true,
    premiumCert: true,
  },
];

export default function Packages() {
  const { t } = useLang();

  const faqs = [
    {
      q: t("packagesFaqUpgradeQ"),
      a: t("packagesFaqUpgradeA"),
    },
    {
      q: t("packagesFaqLessonsExpireQ"),
      a: t("packagesFaqLessonsExpireA"),
    },
    {
      q: t("packagesFaqFailExamQ"),
      a: t("packagesFaqFailExamA"),
    },
    {
      q: t("packagesFaqInstallmentsQ"),
      a: t("packagesFaqInstallmentsA"),
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="bg-hero text-hero-foreground py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-3">
              {t("packagesEyebrow")}
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">{t("packagesTitle")}</h1>
            <p className="text-hero-foreground/80 text-lg">{t("packagesSub")}</p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TIERS.map((pkg, i) => (
              <Reveal
                key={pkg.nameKey}
                className={`relative rounded-2xl border-2 ${pkg.popular ? "border-primary shadow-xl" : "border-border shadow-sm"} p-6 sm:p-8 flex flex-col h-full`}
                delay={i * 0.06}
              >
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">{t("mostPopular")}</Badge>
                  </div>
                )}
                <h3 className="font-bold text-xl text-foreground mb-2">{t(pkg.nameKey)}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-foreground">
                    <CountUpText value={pkg.price} />
                  </span>
                  <span className="text-muted-foreground">֏</span>
                </div>
                <p className="text-sm text-muted-foreground mb-7">
                  {pkg.practical} {t("lessons")} · {pkg.theory} {t("packageFeatTheorySessions")}
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-foreground">
                      {pkg.practical} {t("lessons")} — {t("lessonTypePractical")}
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-foreground">
                      {pkg.theory} {t("packageFeatTheorySessions")}
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-foreground">{t("packageFeatDigitalPrep")}</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-foreground">{t("packageFeatCertificate")}</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-sm">
                    {pkg.priorityBooking ? (
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <span className={pkg.priorityBooking ? "text-foreground" : "text-muted-foreground"}>
                      {t("packageFeatPriorityBooking")}
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5 text-sm">
                    {pkg.instructorChoice ? (
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <span className={pkg.instructorChoice ? "text-foreground" : "text-muted-foreground"}>
                      {t("packageFeatInstructorChoice")}
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5 text-sm">
                    {pkg.premiumCert ? (
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <span className={pkg.premiumCert ? "text-foreground" : "text-muted-foreground"}>
                      {t("packageFeatPremiumCert")}
                    </span>
                  </li>
                </ul>
                <div className="mt-auto">
                  <Link href="/register">
                    <Button
                      className={`w-full ${
                        pkg.popular
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                          : "bg-accent hover:bg-accent/80 text-foreground"
                      }`}
                    >
                      {t("choosePackage")}
                    </Button>
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-accent">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-8 sm:mb-12 text-center">
            {t("packagesFaqTitle")}
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <Reveal key={i} delay={i * 0.06} className="bg-card rounded-xl p-6 border border-border shadow-sm">
                <h4 className="font-semibold text-foreground mb-2">{faq.q}</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">{faq.a}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
