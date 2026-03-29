import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import { useLang } from "src/lib/i18n";
import { ClipboardCheck, Layers, Signpost, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "src/components/ui/button";

export default function ExamTests() {
  const { t } = useLang();

  const modes = [
    {
      icon: ClipboardCheck,
      title: t("examTestsFullTitle"),
      desc: t("examTestsFullDesc"),
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      icon: Layers,
      title: t("examTestsTopicsTitle"),
      desc: t("examTestsTopicsDesc"),
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-100",
    },
    {
      icon: Signpost,
      title: t("examTestsSignsTitle"),
      desc: t("examTestsSignsDesc"),
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    },
  ];

  const steps = [
    t("examTestsStep1"),
    t("examTestsStep2"),
    t("examTestsStep3"),
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="bg-slate-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-blue-400 font-semibold text-sm uppercase tracking-wider mb-3">{t("examTestsEyebrow")}</p>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">{t("examTestsTitle")}</h1>
            <p className="text-slate-300 text-lg">{t("examTestsSub")}</p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {modes.map((m, i) => (
              <div
                key={i}
                className={`rounded-2xl border ${m.border} bg-white shadow-sm p-8 flex flex-col`}
              >
                <div className={`w-14 h-14 ${m.bg} rounded-2xl flex items-center justify-center mb-6`}>
                  <m.icon className={`w-7 h-7 ${m.color}`} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">{m.title}</h2>
                <p className="text-slate-500 leading-relaxed flex-1">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">{t("examTestsHowTitle")}</h2>
          <ol className="space-y-6">
            {steps.map((text, i) => (
              <li key={i} className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                  {i + 1}
                </div>
                <div className="flex gap-3 pt-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-slate-700 leading-relaxed">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">{t("examTestsCtaTitle")}</h2>
          <p className="text-slate-500 text-lg mb-10 max-w-2xl mx-auto">{t("examTestsCtaSub")}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login?redirect=/dashboard/exam-tests">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                {t("examTestsSignInToPractice")}
              </Button>
            </Link>
            <Link href="/packages">
              <Button size="lg" variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50 px-8">
                {t("packages")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
