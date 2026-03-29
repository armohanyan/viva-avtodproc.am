import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { useState } from "react";

export default function Contact() {
  const { t } = useLang();
  const { showToast } = useToast();

  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.email || !form.message) {
      showToast(t("fillRequired"), "error");
      return;
    }
    if (!form.email.includes("@")) {
      showToast(t("invalidEmail"), "error");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setForm({ firstName: "", lastName: "", email: "", phone: "", subject: "", message: "" });
      showToast(t("messageSent"), "success");
    }, 800);
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="bg-slate-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-blue-400 font-semibold text-sm uppercase tracking-wider mb-3">Contact</p>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">{t("contactTitle")}</h1>
            <p className="text-slate-300 text-lg">{t("contactSub")}</p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-8">Send us a message</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("firstName")} *</label>
                    <Input value={form.firstName} onChange={set("firstName")} placeholder="Armen" className="h-11" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("lastName")}</label>
                    <Input value={form.lastName} onChange={set("lastName")} placeholder="Petrosyan" className="h-11" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("emailAddress")} *</label>
                  <Input type="email" value={form.email} onChange={set("email")} placeholder="armen@example.com" className="h-11" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("phoneNumber")}</label>
                  <Input type="tel" value={form.phone} onChange={set("phone")} placeholder="+374 99 123 456" className="h-11" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject</label>
                  <Input value={form.subject} onChange={set("subject")} placeholder="How can we help?" className="h-11" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Message *</label>
                  <textarea
                    rows={5}
                    value={form.message}
                    onChange={set("message")}
                    placeholder="Write your message here..."
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base disabled:opacity-70"
                >
                  {loading ? "Sending..." : t("sendMessage")}
                </Button>
              </form>
            </div>

            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-8">Contact Information</h2>
                <div className="space-y-6">
                  {[
                    { icon: MapPin, label: t("address"), value: "Mashtots Ave, 45, Yerevan, Armenia 0002", color: "bg-blue-50 text-blue-600" },
                    { icon: Phone, label: t("phone"), value: "+374 10 123 456\n+374 99 123 456", color: "bg-emerald-50 text-emerald-600" },
                    { icon: Mail, label: t("email"), value: "info@vivadrive.am\nsupport@vivadrive.am", color: "bg-purple-50 text-purple-600" },
                    { icon: Clock, label: t("workHours"), value: `${t("monFri")}\n${t("sat")}`, color: "bg-amber-50 text-amber-600" },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center shrink-0`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 mb-0.5">{item.label}</p>
                        {item.value.split("\n").map((v, j) => (
                          <p key={j} className="text-sm text-slate-500">{v}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-100 border border-slate-200 h-64 flex items-center justify-center">
                <div className="text-center text-slate-400">
                  <MapPin className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Interactive map</p>
                  <p className="text-xs">Mashtots Ave 45, Yerevan</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
