import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLang } from "@/lib/i18n";
import { Car, BookOpen, Award, RefreshCw, Clock, Users, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Services() {
  const { t } = useLang();

  const services = [
    {
      icon: Car, title: t("practicalLessons"), desc: t("practicalDesc"),
      color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100",
      details: ["Dual-control vehicles for safety", "One-on-one with certified instructor", "City, highway, and parking training", "Flexible scheduling morning & evening"],
      duration: "60 min/lesson", students: "500+ enrolled"
    },
    {
      icon: BookOpen, title: t("theoryCourses"), desc: t("theoryDesc"),
      color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100",
      details: ["Traffic law deep dive", "Road signs & markings", "Online video library access", "Practice exam included"],
      duration: "2 hrs/session", students: "300+ enrolled"
    },
    {
      icon: Award, title: t("licensePrep"), desc: t("licensePrepDesc"),
      color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100",
      details: ["Full mock exam simulation", "Road test preparation", "Instructor feedback sessions", "Exam anxiety support"],
      duration: "3 hrs/session", students: "250+ enrolled"
    },
    {
      icon: RefreshCw, title: t("refresherCourse"), desc: t("refresherDesc"),
      color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100",
      details: ["Skills assessment first", "Targeted improvement plan", "Night driving option", "Certificate on completion"],
      duration: "45 min/lesson", students: "100+ enrolled"
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="bg-slate-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-blue-400 font-semibold text-sm uppercase tracking-wider mb-3">What We Offer</p>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">{t("servicesTitle")}</h1>
            <p className="text-slate-300 text-lg">{t("servicesSub")}</p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-10">
            {services.map((s, i) => (
              <div key={i} className={`bg-white rounded-2xl border ${s.border} shadow-sm overflow-hidden`}>
                <div className="p-8 md:p-10">
                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="md:w-1/3">
                      <div className={`w-14 h-14 ${s.bg} rounded-2xl flex items-center justify-center mb-5`}>
                        <s.icon className={`w-7 h-7 ${s.color}`} />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-3">{s.title}</h2>
                      <p className="text-slate-500 leading-relaxed mb-5">{s.desc}</p>
                      <div className="flex gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className={`w-4 h-4 ${s.color}`} />
                          {s.duration}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className={`w-4 h-4 ${s.color}`} />
                          {s.students}
                        </div>
                      </div>
                    </div>
                    <div className="md:w-2/3">
                      <div className={`${s.bg} rounded-xl p-6`}>
                        <h4 className="font-semibold text-slate-900 mb-4">What's included:</h4>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {s.details.map((d, j) => (
                            <li key={j} className="flex items-center gap-2 text-sm text-slate-700">
                              <CheckCircle2 className={`w-4 h-4 ${s.color} shrink-0`} />
                              {d}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-6">
                          <Link href="/packages">
                            <Button className={`${s.bg} ${s.color} border border-current hover:opacity-80`} variant="outline">
                              View Packages
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
