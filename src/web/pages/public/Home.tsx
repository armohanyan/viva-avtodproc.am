import { Link } from "wouter";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Car, BookOpen, Award, RefreshCw, Star, ArrowRight,
  CheckCircle2, Users, Clock, Trophy, ChevronRight
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const instructors = [
  { name: "Armen Petrosyan", years: 12, students: 340, rating: 4.9, initials: "AP", color: "bg-blue-500" },
  { name: "Narine Hovhannisyan", years: 8, students: 210, rating: 4.8, initials: "NH", color: "bg-purple-500" },
  { name: "Vardan Grigoryan", years: 15, students: 420, rating: 5.0, initials: "VG", color: "bg-emerald-500" },
];

export default function Home() {
  const { t } = useLang();

  const stats = [
    { value: "14+", label: t("yearsExp") },
    { value: "3,200+", label: t("students") },
    { value: "18", label: t("instructorsCount") },
    { value: "94%", label: t("successRate") },
  ];

  const services = [
    { icon: Car, title: t("practicalLessons"), desc: t("practicalDesc"), color: "text-blue-600", bg: "bg-blue-50" },
    { icon: BookOpen, title: t("theoryCourses"), desc: t("theoryDesc"), color: "text-purple-600", bg: "bg-purple-50" },
    { icon: Award, title: t("licensePrep"), desc: t("licensePrepDesc"), color: "text-emerald-600", bg: "bg-emerald-50" },
    { icon: RefreshCw, title: t("refresherCourse"), desc: t("refresherDesc"), color: "text-amber-600", bg: "bg-amber-50" },
  ];

  const packages = [
    {
      name: t("basic"), price: "35,000", currency: "֏", lessons: 10,
      features: [t("practicalLessons"), t("theoryInc")],
      popular: false, color: "border-slate-200"
    },
    {
      name: t("standard"), price: "55,000", currency: "֏", lessons: 18,
      features: [t("practicalLessons"), t("theoryInc"), t("practiceTest")],
      popular: true, color: "border-blue-600"
    },
    {
      name: t("premium"), price: "85,000", currency: "֏", lessons: 28,
      features: [t("practicalLessons"), t("theoryInc"), t("practiceTest"), t("priorityBooking")],
      popular: false, color: "border-slate-200"
    },
  ];

  const testimonials = [
    { name: "Anahit K.", text: "Passed my exam on the first try! The instructors are incredibly patient and professional.", rating: 5 },
    { name: "Tigran M.", text: "Great experience from start to finish. The booking system made it so easy to schedule lessons.", rating: 5 },
    { name: "Mariam S.", text: "I was terrified of driving but Viva helped me become confident behind the wheel.", rating: 5 },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative bg-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-slate-900 to-slate-900" />
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #2563eb 0%, transparent 50%), radial-gradient(circle at 80% 50%, #1d4ed8 0%, transparent 50%)" }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 lg:py-36">
          <div className="max-w-3xl">
            <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30 mb-6 px-3 py-1 text-sm">
              🚗 #1 Driving School in Yerevan
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              {t("heroTitle")}
            </h1>
            <p className="text-lg sm:text-xl text-slate-300 mb-10 max-w-2xl leading-relaxed">
              {t("heroSub")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/register">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 text-base">
                  {t("getStarted")} <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/packages">
                <Button size="lg" variant="outline" className="border-slate-600 text-white hover:bg-slate-800 h-12 text-base">
                  {t("learnMore")}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative border-t border-slate-800 bg-slate-900/80 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl font-bold text-white">{s.value}</div>
                  <div className="text-sm text-slate-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-blue-600 font-semibold text-sm uppercase tracking-wider mb-3">What We Offer</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">{t("servicesTitle")}</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">{t("servicesSub")}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((s, i) => (
              <Card key={i} className="p-6 hover:shadow-lg transition-shadow border-slate-100 group cursor-pointer">
                <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <s.icon className={`w-6 h-6 ${s.color}`} />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
                <div className={`flex items-center gap-1 mt-4 text-sm font-medium ${s.color}`}>
                  {t("learnMore")} <ChevronRight className="w-4 h-4" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-blue-600 font-semibold text-sm uppercase tracking-wider mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">{t("packagesTitle")}</h2>
            <p className="text-slate-500 text-lg">{t("packagesSub")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {packages.map((pkg, i) => (
              <div
                key={i}
                className={`relative bg-white rounded-2xl border-2 ${pkg.color} p-8 ${pkg.popular ? "shadow-xl" : "shadow-sm"} transition-shadow hover:shadow-xl`}
              >
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white px-4 py-1">{t("mostPopular")}</Badge>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="font-bold text-xl text-slate-900 mb-2">{pkg.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-slate-900">{pkg.price}</span>
                    <span className="text-lg text-slate-500">{pkg.currency}</span>
                  </div>
                  <p className="text-slate-500 text-sm mt-1">{pkg.lessons} {t("lessons")}</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {pkg.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <Button
                    className={`w-full ${pkg.popular ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-900"}`}
                  >
                    {t("choosePackage")}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Instructors */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-blue-600 font-semibold text-sm uppercase tracking-wider mb-3">Our Team</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">{t("instructorsTitle")}</h2>
            <p className="text-slate-500 text-lg">{t("instructorsSub")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {instructors.map((ins, i) => (
              <Card key={i} className="p-8 text-center hover:shadow-lg transition-shadow border-slate-100">
                <div className={`w-20 h-20 ${ins.color} rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-5`}>
                  {ins.initials}
                </div>
                <h3 className="font-bold text-lg text-slate-900 mb-1">{ins.name}</h3>
                <div className="flex items-center justify-center gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className={`w-4 h-4 ${j < Math.floor(ins.rating) ? "text-amber-400 fill-amber-400" : "text-slate-200"}`} />
                  ))}
                  <span className="text-sm text-slate-500 ml-1">{ins.rating}</span>
                </div>
                <div className="flex justify-center gap-6 text-sm text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span>{ins.years} {t("experience")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-500" />
                    <span>{ins.students}+</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/instructors">
              <Button variant="outline" className="border-slate-200">
                {t("viewAll")} <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-blue-400 font-semibold text-sm uppercase tracking-wider mb-3">Testimonials</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">What Our Students Say</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t_, i) => (
              <div key={i} className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t_.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">"{t_.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                    {t_.name[0]}
                  </div>
                  <span className="font-medium text-white text-sm">{t_.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Trophy className="w-12 h-12 text-white/80 mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Get Your License?
          </h2>
          <p className="text-blue-100 text-lg mb-10 max-w-xl mx-auto">
            Join thousands of successful drivers. Book your first lesson today and start your journey.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 px-8 h-12 text-base font-semibold">
                {t("getStarted")} <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 h-12 text-base">
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
