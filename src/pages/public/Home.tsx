import { Link } from "wouter";
import { useLang } from "src/lib/i18n";
import { Button } from "src/components/ui/button";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { CountUpText, Reveal } from "src/lib/motion";
import InstructorCard from "src/components/InstructorCard";
import { instructors } from "src/data/instructors";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "src/components/ui/dialog";
import {
  Car,
  BookOpen,
  Award,
  Star,
  ArrowRight,
  CheckCircle2,
  Trophy,
  ChevronRight,
  ChevronLeft,
  Phone,
  Mail,
  MapPin,
  Clock
} from "lucide-react";
import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";

export default function Home() {
  const { t } = useLang();
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const stats = [
    { value: "14+", label: t("yearsExp") },
    { value: "3,200+", label: t("students") },
    { value: "18", label: t("instructorsCount") },
    { value: "94%", label: t("successRate") },
  ];

  const services = [
    { icon: Car, title: t("practicalLessons"), desc: t("practicalDesc"), color: "text-primary", bg: "bg-primary/10", href: "/services" },
    { icon: BookOpen, title: t("theoryCourses"), desc: t("theoryDesc"), color: "text-primary", bg: "bg-primary/10", href: "/services" },
    { icon: Award, title: t("licensePrep"), desc: t("licensePrepDesc"), color: "text-primary", bg: "bg-primary/10", href: "/services" },
  ];

  const packages = [
    {
      name: t("basic"), price: "35,000", currency: "֏", lessons: 10,
      features: [t("practicalLessons"), t("theoryInc")],
      popular: false, color: "border-border"
    },
    {
      name: t("standard"), price: "55,000", currency: "֏", lessons: 18,
      features: [t("practicalLessons"), t("theoryInc"), t("practiceTest")],
      popular: true, color: "border-primary"
    },
    {
      name: t("premium"), price: "85,000", currency: "֏", lessons: 28,
      features: [t("practicalLessons"), t("theoryInc"), t("practiceTest"), t("priorityBooking")],
      popular: false, color: "border-border"
    },
  ];

  const testimonials = [
    { name: "Anahit K.", text: "Passed my exam on the first try! The instructors are incredibly patient and professional.", rating: 5 },
    { name: "Tigran M.", text: "Great experience from start to finish. The booking system made it so easy to schedule lessons.", rating: 5 },
    { name: "Mariam S.", text: "I was terrified of driving but Viva helped me become confident behind the wheel.", rating: 5 },
  ];

  const branches = [
    {
      name: "Գարեգին Նժդեհ 8",
      mapUrl:
        "https://maps.google.com/maps?q=%D4%B3%D5%A1%D6%80%D5%A5%D5%A3%D5%AB%D5%B6%20%D5%86%D5%AA%D5%A4%D5%A5%D5%B0%208%2C%20Yerevan&z=16&output=embed",
    },
    {
      name: "Ազատամարտիկների 75/1",
      mapUrl:
        "https://maps.google.com/maps?q=%D4%B1%D5%9E%D5%A1%D5%BF%D5%A1%D5%B6%D5%A1%D6%80%D5%BF%D5%AB%D5%AF%D5%B6%D5%A5%D6%80%D5%AB%2075%2F1%2C%20Yerevan&z=16&output=embed",
    },
    {
      name: "Ք.Մասիս Երևանյան 125",
      mapUrl:
        "https://maps.google.com/maps?q=%D5%94.%D5%84%D5%A1%D5%BD%D5%AB%D5%BD%20%D4%B5%D6%80%D5%A5%D6%80%D5%A1%D5%B6%D5%B5%D1%8F%D5%B6%20125&z=16&output=embed",
    },
  ] as const;

  type Branch = (typeof branches)[number];
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  const contactTabs = [
    {
      key: "phone",
      icon: Phone,
      label: t("phone"),
      lines: ["+374 10 123 456", "+374 99 123 456"],
      primaryAction: { label: t("phone"), href: "tel:+37410123456" },
    },
    {
      key: "email",
      icon: Mail,
      label: t("email"),
      lines: ["info@vivadrive.am", "support@vivadrive.am"],
      primaryAction: { label: t("email"), href: "mailto:info@vivadrive.am" },
    },
    {
      key: "address",
      icon: MapPin,
      label: t("address"),
      lines: [],
      primaryAction: { label: "Open map", href: "#" },
    },
    {
      key: "hours",
      icon: Clock,
      label: t("workHours"),
      lines: [`${t("monFri")}`, `${t("sat")}`],
      primaryAction: { label: t("workHours"), href: "/contact" },
    },
  ] as const;

  type ContactTabKey = (typeof contactTabs)[number]["key"];
  const [activeContactTab, setActiveContactTab] = useState<ContactTabKey>("phone");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [activeTestimonial, testimonials.length]);

  useEffect(() => {
    // Keep the address map dialog scoped to the Address tab.
    if (activeContactTab !== "address") setSelectedBranch(null);
  }, [activeContactTab]);

  const goToPrevTestimonial = () => {
    setActiveTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goToNextTestimonial = () => {
    setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative bg-hero text-hero-foreground overflow-hidden">
        {/* Background photo */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/home-hero-2.svg')" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-hero/40 to-hero/90" />
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #f48633 0%, transparent 50%), radial-gradient(circle at 80% 50%, #e28d51 0%, transparent 50%)" }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 lg:py-36">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              {t("heroTitle")}
            </h1>
            <p className="text-lg sm:text-xl text-hero-foreground/80 mb-10 max-w-2xl leading-relaxed">
              {t("heroSub")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/register">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 text-base">
                  {t("getStarted")} <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/packages">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-border/60 text-hero-foreground hover:bg-hero-foreground/10 hover:text-hero-foreground h-12 text-base"
                >
                  {t("learnMore")}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative border-t border-border/40 bg-hero/80 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((s, i) => (
                <Reveal key={i} className="text-center" delay={i * 0.05}>
                  <div className="text-3xl font-bold text-hero-foreground">
                    <CountUpText value={s.value} />
                  </div>
                  <div className="text-sm text-hero-foreground/70 mt-1">{s.label}</div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-3">
              {t("servicesEyebrow")}
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{t("servicesTitle")}</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">{t("servicesSub")}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s, i) => (
              <Link key={i} href={s.href} className="block">
                <Card className="p-6 hover:shadow-lg transition-shadow border-border group cursor-pointer flex flex-col h-full">
                  <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                    <s.icon className={`w-6 h-6 ${s.color}`} />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                  <div className={`flex items-center gap-1 mt-auto text-sm font-medium ${s.color}`}>
                    {t("learnMore")} <ChevronRight className="w-4 h-4" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="py-20 bg-accent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-3">
              {t("packagesEyebrow")}
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{t("packagesTitle")}</h2>
            <p className="text-muted-foreground text-lg">{t("packagesSub")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {packages.map((pkg, i) => (
              <div
                key={i}
                className={`relative bg-card rounded-2xl border-2 ${pkg.color} p-6 sm:p-8 ${pkg.popular ? "shadow-xl" : "shadow-sm"} transition-shadow hover:shadow-xl flex flex-col h-full`}
              >
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">{t("mostPopular")}</Badge>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="font-bold text-xl text-foreground mb-2">{pkg.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">{pkg.price}</span>
                    <span className="text-lg text-muted-foreground">{pkg.currency}</span>
                  </div>
                  <p className="text-muted-foreground text-sm mt-1">{pkg.lessons} {t("lessons")}</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {pkg.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  <Link href="/register">
                    <Button
                      className={`w-full ${
                        pkg.popular
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                          : "bg-background hover:bg-accent text-foreground"
                      }`}
                    >
                      {t("choosePackage")}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Instructors */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-3">
              {t("instructorsEyebrow")}
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{t("instructorsTitle")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {instructors.map((ins, i) => (
              <InstructorCard
                key={i}
                instructor={ins}
                showBookButton={true}
                imageHeightClassName="h-64"
              />
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/instructors">
              <Button variant="outline" className="border-border">
                {t("viewAll")} <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-hero text-hero-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-3">
              {t("testimonialsEyebrow")}
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t("testimonialsTitle")}</h2>
          </div>
          <div className="mx-auto max-w-3xl">
            <div className="bg-secondary rounded-2xl p-8 border border-border min-h-[220px]">
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonials[activeTestimonial].rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 text-primary fill-primary" />
                ))}
              </div>
              <p className="text-foreground/80 text-sm leading-relaxed mb-6">
                "{testimonials[activeTestimonial].text}"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
                  {testimonials[activeTestimonial].name[0]}
                </div>
                <span className="font-medium text-foreground text-sm">{testimonials[activeTestimonial].name}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="border-border bg-secondary text-foreground hover:bg-secondary/80 hover:text-foreground"
                onClick={goToPrevTestimonial}
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="w-4 h-4 text-foreground" />
              </Button>
              <div className="flex items-center gap-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveTestimonial(i)}
                    className={`h-2.5 w-2.5 rounded-full transition-colors ${
                      i === activeTestimonial ? "bg-primary" : "bg-border"
                    }`}
                    aria-label={`Go to testimonial ${i + 1}`}
                  />
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="border-border bg-secondary text-foreground hover:bg-secondary/80 hover:text-foreground"
                onClick={goToNextTestimonial}
                aria-label="Next testimonial"
              >
                <ChevronRight className="w-4 h-4 text-foreground" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact overview */}
      <section className="py-20 bg-accent/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {(() => {
            const activeContact = contactTabs.find((tab) => tab.key === activeContactTab)!;
            const ActiveIcon = activeContact.icon;
            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                <div>
                  <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-3">
                    {t("contact")}
                  </p>
                  <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                    {t("contactTitle")}
                  </h2>
                  <p className="text-muted-foreground text-lg leading-relaxed max-w-md">
                    {t("contactSub")}
                  </p>

                  <div className="mt-7 flex flex-wrap gap-3 items-center">
                    <Link href="/contact">
                      <Button
                        size="lg"
                        variant="outline"
                        className="border-primary/40 text-primary hover:bg-primary/5"
                      >
                        {t("contactSendMessageTitle")} <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      Select info below
                    </div>
                  </div>

                  <div className="mt-8 rounded-2xl border border-border/70 bg-card/60 p-2">
                    <div className="flex flex-wrap gap-2">
                      {contactTabs.map((tab) => {
                        const isActive = tab.key === activeContactTab;
                        const TabIcon = tab.icon;
                        return (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveContactTab(tab.key)}
                            className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                              isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                            }`}
                            aria-pressed={isActive}
                          >
                            <span
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isActive ? "bg-primary/15 text-primary" : "bg-accent/40 text-muted-foreground"
                              }`}
                            >
                              <TabIcon className="w-4 h-4" />
                            </span>
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div
                    className="absolute inset-0 -z-10 rounded-3xl"
                    style={{
                      background:
                        "radial-gradient(circle at 20% 20%, rgba(244,134,51,0.25) 0%, transparent 45%), radial-gradient(circle at 80% 30%, rgba(226,141,81,0.20) 0%, transparent 50%), linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.06))",
                    }}
                  />

                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={activeContact.key}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="rounded-3xl border border-border/70 bg-background/70 p-7 shadow-sm"
                    >
                      <div className="flex items-start gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <ActiveIcon className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-primary">{activeContact.label}</p>
                        {activeContact.key !== "address" ? (
                          <div className="mt-3 space-y-1">
                            {activeContact.lines.map((line, idx) => (
                              <p key={idx} className="text-foreground text-lg font-semibold leading-relaxed">
                                {line}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-3">
                            <h3 className="text-sm font-semibold text-primary mb-3">{t("branches")}</h3>
                            <div className="space-y-3">
                              {branches.map((branch) => (
                                <div
                                  key={branch.name}
                                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border bg-background px-3 py-2.5"
                                >
                                  <p className="text-sm text-foreground">{branch.name}</p>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setSelectedBranch(branch)}
                                    aria-label={`Open map for ${branch.name}`}
                                  >
                                    <MapPin className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                          <div className="mt-5 flex flex-wrap gap-3 items-center">
                            {activeContact.key === "phone" && (
                              <Button
                                asChild
                                size="lg"
                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                              >
                                <a href={activeContact.primaryAction.href}>{t("phone")}</a>
                              </Button>
                            )}
                            {activeContact.key === "email" && (
                              <Button
                                asChild
                                size="lg"
                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                              >
                                <a href={activeContact.primaryAction.href}>{t("email")}</a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      <Dialog open={!!selectedBranch} onOpenChange={(open) => !open && setSelectedBranch(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {selectedBranch && (
            <>
              <DialogHeader className="px-6 pt-6 pb-3">
                <DialogTitle>{selectedBranch.name}</DialogTitle>
              </DialogHeader>
              <div className="px-6 pb-6">
                <iframe
                  title={`Map for ${selectedBranch.name}`}
                  src={selectedBranch.mapUrl}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-[420px] rounded-xl border border-border"
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* CTA */}
      <section className="py-20 bg-primary">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Trophy className="w-12 h-12 text-primary-foreground/80 mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-4">
            {t("ctaReadyLicenseTitle")}
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-10 max-w-xl mx-auto">
            {t("ctaReadyLicenseSub")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-hero text-hero-foreground hover:bg-hero/90 px-8 h-12 text-base font-semibold"
              >
                {t("getStarted")} <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground h-12 text-base"
              >
                {t("contact")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
