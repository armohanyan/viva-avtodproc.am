import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLang } from "@/lib/i18n";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

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

      <section className="bg-slate-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-blue-400 font-semibold text-sm uppercase tracking-wider mb-3">Pricing</p>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">{t("packagesTitle")}</h1>
            <p className="text-slate-300 text-lg">{t("packagesSub")}</p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {packages.map((pkg, i) => (
              <div
                key={i}
                className={`relative rounded-2xl border-2 ${pkg.popular ? "border-blue-600 shadow-xl" : "border-slate-200 shadow-sm"} p-8`}
              >
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white px-4 py-1">{t("mostPopular")}</Badge>
                  </div>
                )}
                <h3 className="font-bold text-xl text-slate-900 mb-2">{pkg.name}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-slate-900">{pkg.price}</span>
                  <span className="text-slate-500">֏</span>
                </div>
                <p className="text-sm text-slate-500 mb-7">{pkg.lessons} {t("lessons")} included</p>
                <ul className="space-y-3 mb-8">
                  {pkg.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm">
                      {f.inc
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        : <X className="w-4 h-4 text-slate-300 shrink-0" />}
                      <span className={f.inc ? "text-slate-700" : "text-slate-400"}>{f.text}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <Button className={`w-full ${pkg.popular ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-800"}`}>
                    {t("choosePackage")}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                <h4 className="font-semibold text-slate-900 mb-2">{faq.q}</h4>
                <p className="text-slate-500 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
