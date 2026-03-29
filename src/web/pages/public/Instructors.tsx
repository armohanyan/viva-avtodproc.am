import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLang } from "@/lib/i18n";
import { Star, Clock, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

const instructors = [
  { name: "Armen Petrosyan", years: 12, students: 340, rating: 4.9, initials: "AP", color: "bg-blue-500", specialties: ["City Driving", "Highway", "Night Driving"], bio: "Experienced instructor specializing in nervous beginners and advanced driving techniques." },
  { name: "Narine Hovhannisyan", years: 8, students: 210, rating: 4.8, initials: "NH", color: "bg-purple-500", specialties: ["Beginners", "Theory", "Exam Prep"], bio: "Patient and methodical, Narine has helped over 200 students pass their exams with confidence." },
  { name: "Vardan Grigoryan", years: 15, students: 420, rating: 5.0, initials: "VG", color: "bg-emerald-500", specialties: ["All Levels", "Night Driving", "Refresher"], bio: "Vardan is our most experienced instructor with 15 years and a perfect 5.0 rating." },
  { name: "Lilit Sargsyan", years: 6, students: 175, rating: 4.7, initials: "LS", color: "bg-pink-500", specialties: ["Beginners", "Parking", "City"], bio: "Specializes in helping beginners overcome fear and build confidence on the road." },
  { name: "Hovhannes Mkrtchyan", years: 10, students: 290, rating: 4.9, initials: "HM", color: "bg-amber-500", specialties: ["Highway", "Long Distance", "Advanced"], bio: "Expert in highway driving and advanced maneuver techniques." },
  { name: "Ani Karapetyan", years: 7, students: 195, rating: 4.8, initials: "AK", color: "bg-teal-500", specialties: ["Automatic", "Manual", "Theory"], bio: "Certified in both automatic and manual transmission teaching." },
];

export default function Instructors() {
  const { t } = useLang();

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="bg-slate-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-blue-400 font-semibold text-sm uppercase tracking-wider mb-3">Our Team</p>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">{t("instructorsTitle")}</h1>
            <p className="text-slate-300 text-lg">{t("instructorsSub")}</p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {instructors.map((ins, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-shadow overflow-hidden">
                <div className="p-8">
                  <div className="flex items-start gap-4 mb-5">
                    <div className={`w-16 h-16 ${ins.color} rounded-2xl flex items-center justify-center text-white font-bold text-xl shrink-0`}>
                      {ins.initials}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">{ins.name}</h3>
                      <div className="flex items-center gap-1 mt-1">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star key={j} className={`w-3.5 h-3.5 ${j < Math.floor(ins.rating) ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}`} />
                        ))}
                        <span className="text-xs text-slate-500 ml-1">{ins.rating}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 mb-5 leading-relaxed">{ins.bio}</p>

                  <div className="flex gap-4 text-sm text-slate-500 mb-5">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span>{ins.years} {t("experience")}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-emerald-500" />
                      <span>{ins.students}+ {t("students_trained")}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {ins.specialties.map((s, j) => (
                      <Badge key={j} variant="secondary" className="text-xs bg-slate-100 text-slate-600">
                        {s}
                      </Badge>
                    ))}
                  </div>

                  <Link href="/register">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" size="sm">
                      {t("bookLesson")}
                    </Button>
                  </Link>
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
