"use client";

import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { AppModal } from "src/components/AppModal";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { useState } from "react";
import { Reveal } from "src/lib/motion";
import type { Branch } from "src/modules/branches";
import { useBranches } from "src/modules/branches";
import { cityNameById, useCities } from "src/modules/cities";
import { useMarketingPublic } from "src/modules/marketing/useMarketingPublic";
import { useMemo } from "react";

export default function Contact() {
  const { t } = useLang();
  const { showToast } = useToast();
  const { branches } = useBranches();
  const { cities } = useCities();
  const { data: mkt } = useMarketingPublic();

  const contactInfoRows = useMemo(() => {
    const c = mkt?.contact;
    const rows: { icon: typeof Phone; label: string; value: string; color: string }[] = [];
    if (c?.phones?.length) {
      rows.push({
        icon: Phone,
        label: t("phone"),
        value: c.phones.join("\n"),
        color: "bg-primary/10 text-primary",
      });
    }
    if (c?.emails?.length) {
      rows.push({
        icon: Mail,
        label: t("email"),
        value: c.emails.join("\n"),
        color: "bg-primary/10 text-primary",
      });
    }
    const hourLines: string[] = [];
    if (c?.hoursWeekdays?.trim()) hourLines.push(c.hoursWeekdays.trim());
    if (c?.hoursSaturday?.trim()) hourLines.push(c.hoursSaturday.trim());
    if (hourLines.length) {
      rows.push({
        icon: Clock,
        label: t("workHours"),
        value: hourLines.join("\n"),
        color: "bg-primary/10 text-primary",
      });
    }
    return rows;
  }, [mkt, t]);

  const showContactInfo = contactInfoRows.length > 0;
  const showBranches = branches.length > 0;
  const showRightColumn = showContactInfo || showBranches;

  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

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

      <section className="bg-hero text-hero-foreground py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-3">Contact</p>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">{t("contactTitle")}</h1>
            <p className="text-hero-foreground/80 text-lg">{t("contactSub")}</p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`grid grid-cols-1 gap-8 md:gap-12 lg:gap-16 ${showRightColumn ? "lg:grid-cols-2" : ""}`}
          >
            <Reveal>
              <h2 className="text-2xl font-bold text-foreground mb-8">{t("contactSendMessageTitle")}</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("firstName")} *</label>
                    <Input value={form.firstName} onChange={set("firstName")} placeholder={t("firstName")} className="h-11" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("lastName")}</label>
                    <Input value={form.lastName} onChange={set("lastName")} placeholder={t("lastName")} className="h-11" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("emailAddress")} *</label>
                  <Input type="email" value={form.email} onChange={set("email")} placeholder={t("emailAddress")} className="h-11" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("phoneNumber")}</label>
                  <Input type="tel" value={form.phone} onChange={set("phone")} placeholder="+374 99 123 456" className="h-11" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Subject</label>
                  <Input value={form.subject} onChange={set("subject")} placeholder="How can we help?" className="h-11" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Message *</label>
                  <textarea
                    rows={5}
                    value={form.message}
                    onChange={set("message")}
                    placeholder="Write your message here..."
                    className="w-full rounded-lg border border-border px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-base disabled:opacity-70"
                >
                  {loading ? "Sending..." : t("sendMessage")}
                </Button>
              </form>
            </Reveal>

            {showRightColumn ? (
              <Reveal className="space-y-8" delay={0.08}>
                {showContactInfo ? (
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-8">{t("contactInformationTitle")}</h2>
                    <div className="space-y-6">
                      {contactInfoRows.map((item, i) => (
                        <div key={i} className="flex gap-4">
                          <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center shrink-0`}>
                            <item.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground mb-0.5">{item.label}</p>
                            {item.value.split("\n").map((v, j) => (
                              <p key={j} className="text-sm text-muted-foreground">
                                {v}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {showBranches ? (
                  <div className="rounded-2xl border border-border p-5 space-y-4 bg-accent/40">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">{t("branches")}</h3>
                    </div>
                    <div className="space-y-3">
                      {branches.map((branch) => (
                        <div
                          key={branch.id}
                          className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between rounded-lg border border-border bg-background px-3 py-2.5"
                        >
                          <div className="min-w-0 space-y-1">
                            <p className="text-sm font-medium text-foreground">{branch.name}</p>
                            <p className="text-xs text-muted-foreground/90">{cityNameById(cities, branch.cityId)}</p>
                            {branch.phone && <p className="text-xs text-muted-foreground">{branch.phone}</p>}
                            {branch.email && <p className="text-xs text-muted-foreground">{branch.email}</p>}
                            {branch.workHours && <p className="text-xs text-muted-foreground">{branch.workHours}</p>}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="shrink-0"
                            onClick={() => setSelectedBranch(branch)}
                            aria-label={`Open map for ${branch.name}`}
                          >
                            <MapPin className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </Reveal>
            ) : null}
          </div>
        </div>
      </section>

      {selectedBranch ? (
        <AppModal
          open={!!selectedBranch}
          onOpenChange={(open) => !open && setSelectedBranch(null)}
          title={selectedBranch.name}
          contentClassName="max-w-4xl"
          bodyClassName="px-6 pb-6 pt-0"
        >
          <iframe
            title={`Map for ${selectedBranch.name}`}
            src={selectedBranch.mapUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full h-[420px] rounded-xl border border-border"
          />
        </AppModal>
      ) : null}

      <Footer />
    </div>
  );
}
