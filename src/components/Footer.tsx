import { Link } from "wouter";
import { Facebook, Instagram, Youtube, Phone, Mail, MapPin } from "lucide-react";
import { useLang } from "../lib/i18n";
import { useToast } from "../lib/toast";
import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export default function Footer() {
  const { t } = useLang();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const socialLinks = [
    { icon: Facebook, href: "https://facebook.com", label: "Facebook" },
    { icon: Instagram, href: "https://instagram.com", label: "Instagram" },
    { icon: Youtube, href: "https://youtube.com", label: "YouTube" },
  ];

  const handleSubscribe = () => {
    if (!email || !email.includes("@")) {
      showToast(t("invalidEmail"), "error");
      return;
    }
    setEmail("");
    showToast(t("subscribed"), "success");
  };

  return (
    <footer className="bg-hero text-hero-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center overflow-hidden">
                <img src="/logo.jpg" alt={t("brandName")} className="w-7 h-7 object-contain" />
              </div>
            </div>
            <p className="text-sm text-hero-foreground/80 leading-relaxed mb-5">{t("aboutSub")}</p>
            <div className="flex gap-3">
              {socialLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={item.label}
                  className="w-9 h-9 rounded-lg bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
                >
                  <item.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-hero-foreground mb-4">{t("quickLinks")}</h4>
            <ul className="space-y-2">
              {[
                { href: "/about", label: t("about") },
                { href: "/services", label: t("services") },
                { href: "/thematic-questions", label: t("examTests") },
                { href: "/packages", label: t("packages") },
                { href: "/instructors", label: t("instructors") },
                { href: "/contact", label: t("contact") },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-hero-foreground/80 hover:text-hero-foreground transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-hero-foreground mb-4">{t("contact")}</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                <span>Yerevan, Armenia<br />Mashtots Ave, 45</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <span>+374 10 123 456</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <span>info@vivadrive.am</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-hero-foreground mb-4">{t("newsletter")}</h4>
            <p className="text-sm text-hero-foreground/80 mb-4">{t("subscribeText")}</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubscribe()}
                placeholder={t("yourEmail")}
                className="h-11 w-full min-w-0 bg-background/90 text-foreground placeholder:text-muted-foreground border-border sm:flex-1"
              />
              <Button
                type="button"
                onClick={handleSubscribe}
                className="h-11 w-full px-4 bg-primary hover:bg-primary/90 text-primary-foreground sm:w-auto sm:shrink-0"
              >
                {t("subscribe")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-hero-foreground/70">
            © 2026 {t("brandName")}. {t("allRights")}
          </p>
          <div className="flex gap-4 text-xs text-hero-foreground/70">
            <button
              type="button"
              onClick={() => showToast("Privacy policy page is coming soon.", "info")}
              className="hover:text-hero-foreground/90"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => showToast("Terms of service page is coming soon.", "info")}
              className="hover:text-hero-foreground/90"
            >
              Terms of Service
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
