import { Link } from "wouter";
import { Car, Facebook, Instagram, Youtube, Phone, Mail, MapPin } from "lucide-react";
import { useLang } from "../lib/i18n";
import { useToast } from "../lib/toast";
import { useState } from "react";

export default function Footer() {
  const { t } = useLang();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");

  const handleSubscribe = () => {
    if (!email || !email.includes("@")) {
      showToast(t("invalidEmail"), "error");
      return;
    }
    setEmail("");
    showToast(t("subscribed"), "success");
  };

  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                <Car className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-white">Viva Drive</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-5">{t("aboutSub")}</p>
            <div className="flex gap-3">
              {[Facebook, Instagram, Youtube].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-blue-600 flex items-center justify-center transition-colors">
                  <Icon className="w-4 h-4 text-slate-300" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">{t("quickLinks")}</h4>
            <ul className="space-y-2">
              {[
                { href: "/about", label: t("about") },
                { href: "/services", label: t("services") },
                { href: "/exam-tests", label: t("examTests") },
                { href: "/packages", label: t("packages") },
                { href: "/instructors", label: t("instructors") },
                { href: "/contact", label: t("contact") },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm hover:text-white transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">{t("contact")}</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 text-blue-400 shrink-0" />
                <span>Yerevan, Armenia<br />Mashtots Ave, 45</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                <span>+374 10 123 456</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                <span>info@vivadrive.am</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">{t("newsletter")}</h4>
            <p className="text-sm text-slate-400 mb-4">{t("subscribeText")}</p>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubscribe()}
                placeholder={t("yourEmail")}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSubscribe}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {t("subscribe")}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-slate-500">© 2024 Viva Driving School. {t("allRights")}</p>
          <div className="flex gap-4 text-xs text-slate-500">
            <a href="#" className="hover:text-slate-300">Privacy Policy</a>
            <a href="#" className="hover:text-slate-300">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
