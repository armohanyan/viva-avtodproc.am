import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import { useLang } from "src/lib/i18n";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "src/components/ui/button";
import { Badge } from "src/components/ui/badge";
import { Link } from "wouter";
import { CountUpText, Reveal } from "src/lib/motion";

export default function Packages() {
  const { t } = useLang();

  const packages = [
    {
      name: t("basic"), price: "35,000", lessons: 10, popular: false,
      features: [
        { text: "10 practical lessons (60 min)", inc: true },
        { text: "Online theory access", inc: true },
        { text: "Practice exam", inc: false },
        { text: "Priority booking", inc: false },
        { text: "Instructor choice", inc: false },
        { text: "Certificate", inc: true },
      ]
    },
    {
      name: t("standard"), price: "55,000", lessons: 18, popular: true,
      features: [
        { text: "18 practical lessons (60 min)", inc: true },
        { text: "Online theory access", inc: true },
        { text: "Practice exam (2 sessions)", inc: true },
        { text: "Priority booking", inc: false },
        { text: "Instructor choice", inc: true },
        { text: "Certificate", inc: true },
      ]
    },
    {
      name: t("premium"), price: "85,000", lessons: 28, popular: false,
      features: [
        { text: "28 practical lessons (60 min)", inc: true },
        { text: "Online theory access", inc: true },
        { text: "Practice exam (unlimited)", inc: true },
        { text: "Priority booking", inc: true },
        { text: "Instructor choice", inc: true },
        { text: "Certificate + framing", inc: true },
      ]
    },
  ];

  const faqs = [
    { q: "Can I upgrade my package later?", a: "Yes, you can upgrade at any time by paying the difference." },
    { q: "Do lessons expire?", a: "Lessons are valid for 12 months from the date of purchase." },
    { q: "What if I fail the exam?", a: "Standard and Premium packages include additional exam prep support at no extra cost." },
    { q: "Are payments installable?", a: "Yes, we offer monthly installment plans for Standard and Premium packages." },
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
            {packages.map((pkg, i) => (
              <Reveal
                key={i}
                className={`relative rounded-2xl border-2 ${pkg.popular ? "border-primary shadow-xl" : "border-border shadow-sm"} p-8 flex flex-col h-full`}
                delay={i * 0.06}
              >
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">{t("mostPopular")}</Badge>
                  </div>
                )}
                <h3 className="font-bold text-xl text-foreground mb-2">{pkg.name}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-foreground">
                    <CountUpText value={pkg.price} />
                  </span>
                  <span className="text-muted-foreground">֏</span>
                </div>
                <p className="text-sm text-muted-foreground mb-7">
                  <CountUpText value={pkg.lessons} /> {t("lessons")} included
                </p>
                <ul className="space-y-3 mb-8">
                  {pkg.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm">
                      {f.inc
                        ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        : <X className="w-4 h-4 text-muted-foreground shrink-0" />}
                      <span className={f.inc ? "text-foreground" : "text-muted-foreground"}>{f.text}</span>
                    </li>
                  ))}
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

      {/* FAQ */}
      <section className="py-20 bg-accent">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground mb-12 text-center">Frequently Asked Questions</h2>
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
