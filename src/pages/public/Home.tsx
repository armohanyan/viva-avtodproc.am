import { Link } from "wouter";
import { useLang } from "src/lib/i18n";
import { Button } from "src/components/ui/button";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { CountUpText, Reveal } from "src/lib/motion";
import InstructorCard from "src/components/InstructorCard";
import { instructors } from "src/data/instructors";
import { useEffect, useState } from "react";
import {
  Car,
  BookOpen,
  Award,
  Star,
  ArrowRight,
  CheckCircle2,
  Trophy,
  ChevronRight,
  ChevronLeft
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [activeTestimonial, testimonials.length]);

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
          style={{ backgroundImage: "url('/home-hero.jpg')" }}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                className={`relative bg-card rounded-2xl border-2 ${pkg.color} p-8 ${pkg.popular ? "shadow-xl" : "shadow-sm"} transition-shadow hover:shadow-xl flex flex-col h-full`}
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
                showBookButton={false}
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
