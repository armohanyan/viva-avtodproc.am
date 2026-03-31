import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import { useLang } from "src/lib/i18n";
import { Car, BookOpen, Award, Clock, Users, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "src/components/ui/button";
import { CountUpText, Reveal } from "src/lib/motion";

export default function Services() {
  const { t } = useLang();

  const services = [
    {
      icon: Car, title: t("practicalLessons"), desc: t("practicalDesc"),
      color: "text-primary", bg: "bg-primary/10", border: "border-primary/20",
      details: [t("servicesCardPracticalDetail1"), t("servicesCardPracticalDetail2"), t("servicesCardPracticalDetail3"), t("servicesCardPracticalDetail4")],
      duration: t("servicesCardPracticalDuration"), students: t("servicesCardPracticalStudents")
    },
    {
      icon: BookOpen, title: t("theoryCourses"), desc: t("theoryDesc"),
      color: "text-primary", bg: "bg-primary/10", border: "border-primary/20",
      details: [t("servicesCardTheoryDetail1"), t("servicesCardTheoryDetail2"), t("servicesCardTheoryDetail3"), t("servicesCardTheoryDetail4")],
      duration: t("servicesCardTheoryDuration"), students: t("servicesCardTheoryStudents")
    },
    {
      icon: Award, title: t("licensePrep"), desc: t("licensePrepDesc"),
      color: "text-primary", bg: "bg-primary/10", border: "border-primary/20",
      details: [t("servicesCardPrepDetail1"), t("servicesCardPrepDetail2"), t("servicesCardPrepDetail3"), t("servicesCardPrepDetail4")],
      duration: t("servicesCardPrepDuration"), students: t("servicesCardPrepStudents")
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="bg-hero text-hero-foreground py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-3">
              {t("servicesEyebrow")}
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">{t("servicesTitle")}</h1>
            <p className="text-hero-foreground/80 text-lg">{t("servicesSub")}</p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-10">
            {services.map((s, i) => (
              <Reveal
                key={i}
                className={`mx-auto w-full max-w-5xl bg-card rounded-2xl border ${s.border} shadow-sm overflow-hidden`}
                delay={i * 0.06}
              >
                <div className="p-6 sm:p-8 md:p-10">
                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="md:w-1/3">
                      <div className={`w-14 h-14 ${s.bg} rounded-2xl flex items-center justify-center mb-5`}>
                        <s.icon className={`w-7 h-7 ${s.color}`} />
                      </div>
                      <h2 className="text-2xl font-bold text-foreground mb-3">{s.title}</h2>
                      <p className="text-muted-foreground leading-relaxed mb-5">{s.desc}</p>
                      <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:gap-4">
                        <div className="flex items-center gap-1.5">
                          <Clock className={`w-4 h-4 ${s.color}`} />
                          <CountUpText value={s.duration} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className={`w-4 h-4 ${s.color}`} />
                          <CountUpText value={s.students} />
                        </div>
                      </div>
                    </div>
                    <div className="md:w-2/3">
                      <div className={`${s.bg} rounded-xl p-6`}>
                        <h4 className="font-semibold text-foreground mb-4">{t("servicesIncludedTitle")}</h4>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {s.details.map((d, j) => (
                            <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className={`w-4 h-4 ${s.color} shrink-0`} />
                              {d}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-6">
                          <Link href="/packages">
                            <Button
                              className={`${s.bg} ${s.color} border border-current/50 hover:opacity-80`}
                              variant="outline"
                            >
                              {t("servicesViewPackagesCta")}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
