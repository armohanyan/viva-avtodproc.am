import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import { useLang } from "src/lib/i18n";
import { CheckCircle2, Target, Eye, Heart } from "lucide-react";

export default function About() {
  const { t } = useLang();

  const values = [
    { icon: Target, title: "Safety First", desc: "Every lesson prioritizes road safety and responsible driving habits." },
    { icon: Eye, title: "Transparency", desc: "Clear pricing, honest timelines, and no hidden surprises." },
    { icon: Heart, title: "Student-Centered", desc: "We adapt to each student's pace, learning style, and goals." },
  ];

  const milestones = [
    { year: "2010", event: "Viva Driving School founded in Yerevan" },
    { year: "2013", event: "Expanded to 3 training locations" },
    { year: "2016", event: "Launched online theory courses" },
    { year: "2019", event: "Reached 1,000 licensed graduates" },
    { year: "2022", event: "Introduced modern dual-control fleet" },
    { year: "2024", event: "3,200+ successful graduates" },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="bg-slate-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-blue-400 font-semibold text-sm uppercase tracking-wider mb-3">About Us</p>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">{t("aboutTitle")}</h1>
            <p className="text-slate-300 text-lg leading-relaxed">{t("aboutSub")}</p>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Our Story</h2>
              <p className="text-slate-600 leading-relaxed mb-4">{t("aboutText")}</p>
              <p className="text-slate-600 leading-relaxed mb-8">
                Founded in 2010, we have grown from a small family-run school to Armenia's largest and most trusted driving education center. Our fleet of 20+ modern vehicles and team of 18 certified instructors are ready to guide you every step of the way.
              </p>
              <ul className="space-y-3">
                {["Certified by Ministry of Transport", "Modern dual-control vehicles", "Flexible scheduling", "Online theory portal"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-10 text-white">
              <h3 className="text-2xl font-bold mb-4">{t("ourMission")}</h3>
              <p className="text-blue-100 leading-relaxed text-lg">{t("missionText")}</p>
              <div className="mt-8 grid grid-cols-2 gap-6">
                {[
                  { v: "3,200+", l: "Graduates" },
                  { v: "94%", l: "Pass Rate" },
                  { v: "18", l: "Instructors" },
                  { v: "14", l: "Years Active" },
                ].map((s, i) => (
                  <div key={i}>
                    <div className="text-3xl font-bold">{s.v}</div>
                    <div className="text-blue-200 text-sm">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Our Values</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((v, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <v.icon className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 mb-3">{v.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Our Journey</h2>
          </div>
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-px bg-slate-200" />
            <div className="space-y-8">
              {milestones.map((m, i) => (
                <div key={i} className="flex gap-6 items-start">
                  <div className="relative z-10 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-xs">{m.year}</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 flex-1 mt-3">
                    <p className="text-slate-700 font-medium">{m.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
