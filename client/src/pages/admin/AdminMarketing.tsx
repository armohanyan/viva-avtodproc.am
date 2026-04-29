"use client";

import { FormEvent, useCallback, useEffect, useId, useState } from "react";
import AdminLayout from "src/components/AdminLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import type { MarketingAdminBundle, MarketingTestimonialAdmin } from "src/modules/marketing/types";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "src/components/ui/tabs";
import { Sparkles, Plus, Edit2, Trash2 } from "lucide-react";
import { AppModal } from "src/components/AppModal";
import ConfirmDialog from "src/components/ConfirmDialog";
import { cn } from "src/lib/utils";
import { MARKETING_STAT_LABEL_KEY } from "src/modules/marketing/statLabels";
import type { TranslationKey } from "src/lib/i18n";

const textareaClass = cn(
  "flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none md:text-sm dark:bg-input/30",
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
);

export default function AdminMarketing() {
  const testimonialFormId = useId();
  const { t } = useLang();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MarketingAdminBundle["stats"]>([]);
  const [testimonials, setTestimonials] = useState<MarketingTestimonialAdmin[]>([]);
  const [phonesText, setPhonesText] = useState("");
  const [emailsText, setEmailsText] = useState("");
  const [hoursWeekdays, setHoursWeekdays] = useState("");
  const [hoursSaturday, setHoursSaturday] = useState("");
  const [primaryTelHref, setPrimaryTelHref] = useState("");
  const [primaryMailtoHref, setPrimaryMailtoHref] = useState("");
  const [footerLine1, setFooterLine1] = useState("");
  const [footerLine2, setFooterLine2] = useState("");
  const [socialFb, setSocialFb] = useState("");
  const [socialIg, setSocialIg] = useState("");
  const [socialYt, setSocialYt] = useState("");
  const [socialTt, setSocialTt] = useState("");
  const [socialWhatsapp, setSocialWhatsapp] = useState("");

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editTm, setEditTm] = useState<MarketingTestimonialAdmin | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [tmDraft, setTmDraft] = useState({
    authorName: "",
    quote: "",
    rating: 5,
    sortOrder: 0,
    published: true,
  });

  const applyBundle = useCallback((b: MarketingAdminBundle) => {
    setStats(b.stats);
    setTestimonials(b.testimonials);
    setPhonesText(b.contact.phones.join("\n"));
    setEmailsText(b.contact.emails.join("\n"));
    setHoursWeekdays(b.contact.hoursWeekdays);
    setHoursSaturday(b.contact.hoursSaturday);
    setPrimaryTelHref(b.contact.primaryTelHref);
    setPrimaryMailtoHref(b.contact.primaryMailtoHref);
    setFooterLine1(b.footer.addressLine1);
    setFooterLine2(b.footer.addressLine2);
    setSocialFb(b.social.facebook);
    setSocialIg(b.social.instagram);
    setSocialYt(b.social.youtube);
    setSocialTt(b.social.tiktok ?? "");
    setSocialWhatsapp(b.social.whatsapp ?? "");
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const b = await vivaApiJson<MarketingAdminBundle>("/marketing/admin");
      applyBundle(b);
    } catch (e) {
      showToast(getApiErrorMessage(e) || t("couldNotLoadData"), "error");
    } finally {
      setLoading(false);
    }
  }, [applyBundle, showToast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveStats = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        stats: stats.map((s, i) => ({
          key: s.key,
          value: s.value,
          sortOrder: s.sortOrder ?? i,
        })),
      };
      const next = await vivaApiJson<MarketingAdminBundle["stats"]>("/marketing/stats", {
        method: "PUT",
        body,
      });
      setStats(Array.isArray(next) ? next : stats);
      showToast(t("blogUpdatedToast"), "success");
    } catch (e) {
      showToast(getApiErrorMessage(e) || t("couldNotLoadData"), "error");
    }
  };

  const saveContact = async (e: FormEvent) => {
    e.preventDefault();
    const phones = phonesText
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    const emails = emailsText
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    try {
      const data = await vivaApiJson<{
        contact: MarketingAdminBundle["contact"];
        footer: MarketingAdminBundle["footer"];
        social: MarketingAdminBundle["social"];
      }>("/marketing/settings", {
        method: "PUT",
        body: {
          contact: {
            phones,
            emails,
            hoursWeekdays: hoursWeekdays.trim(),
            hoursSaturday: hoursSaturday.trim(),
            primaryTelHref: primaryTelHref.trim(),
            primaryMailtoHref: primaryMailtoHref.trim(),
          },
          footer: { addressLine1: footerLine1.trim(), addressLine2: footerLine2.trim() },
          social: {
            facebook: socialFb.trim(),
            instagram: socialIg.trim(),
            youtube: socialYt.trim(),
            tiktok: socialTt.trim(),
            whatsapp: socialWhatsapp.trim(),
          },
        },
      });
      setPhonesText(data.contact.phones.join("\n"));
      setEmailsText(data.contact.emails.join("\n"));
      showToast(t("blogUpdatedToast"), "success");
    } catch (e) {
      showToast(getApiErrorMessage(e) || t("couldNotLoadData"), "error");
    }
  };

  const openAdd = () => {
    setTmDraft({
      authorName: "",
      quote: "",
      rating: 5,
      sortOrder: testimonials.length,
      published: true,
    });
    setAddOpen(true);
  };

  const submitTestimonial = async (e: FormEvent) => {
    e.preventDefault();
    if (!tmDraft.authorName.trim() || !tmDraft.quote.trim()) {
      showToast(t("fillRequired"), "error");
      return;
    }
    try {
      if (editTm) {
        await vivaApiJson(`/marketing/testimonials/${encodeURIComponent(editTm.id)}`, {
          method: "PATCH",
          body: {
            authorName: tmDraft.authorName.trim(),
            quote: tmDraft.quote.trim(),
            rating: tmDraft.rating,
            sortOrder: tmDraft.sortOrder,
            published: tmDraft.published,
          },
        });
        setEditTm(null);
      } else {
        await vivaApiJson("/marketing/testimonials", {
          method: "POST",
          body: {
            authorName: tmDraft.authorName.trim(),
            quote: tmDraft.quote.trim(),
            rating: tmDraft.rating,
            sortOrder: tmDraft.sortOrder,
            published: tmDraft.published,
          },
        });
        setAddOpen(false);
      }
      await load();
      showToast(t("blogUpdatedToast"), "success");
    } catch (e) {
      showToast(getApiErrorMessage(e) || t("couldNotLoadData"), "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await vivaApiJson(`/marketing/testimonials/${encodeURIComponent(deleteId)}`, { method: "DELETE" });
      setDeleteId(null);
      await load();
      showToast(t("blogDeletedToast"), "success");
    } catch (e) {
      showToast(getApiErrorMessage(e) || t("couldNotLoadData"), "error");
    }
  };

  const statLabel = (key: string): string => {
    const k = MARKETING_STAT_LABEL_KEY[key] as TranslationKey | undefined;
    return k ? t(k) : key;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-8 text-muted-foreground">{t("loading")}</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={Sparkles}
        title={t("adminMarketingContent")}
        subtitle={t("adminMarketingSubtitle")}
      />

      <Tabs defaultValue="stats" className="mt-6 space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="stats">{t("adminMarketingStatsSection")}</TabsTrigger>
          <TabsTrigger value="testimonials">{t("adminMarketingTestimonialsSection")}</TabsTrigger>
          <TabsTrigger value="contact">{t("adminMarketingContactSection")}</TabsTrigger>
        </TabsList>

        <TabsContent value="stats">
          <form onSubmit={saveStats} className="max-w-xl space-y-4 rounded-xl border border-border bg-card p-6">
            {stats.map((s, i) => (
              <div key={s.key} className="space-y-1.5">
                <Label className="text-muted-foreground">
                  {t("adminMarketingStatKey")}: {statLabel(s.key)}
                </Label>
                <Input
                  value={s.value}
                  onChange={(e) => {
                    const v = e.target.value;
                    setStats((prev) => prev.map((x, j) => (j === i ? { ...x, value: v } : x)));
                  }}
                  className="h-10"
                />
              </div>
            ))}
            <Button type="submit" className="bg-primary text-primary-foreground">
              {t("adminMarketingSaveStats")}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="testimonials" className="space-y-4">
          <div className="flex justify-end">
            <Button type="button" onClick={openAdd} className="gap-2 bg-primary text-primary-foreground">
              <Plus className="w-4 h-4" />
              {t("adminMarketingAddTestimonial")}
            </Button>
          </div>
          {testimonials.length === 0 ? (
            <p className="text-muted-foreground">{t("adminMarketingNoTestimonials")}</p>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-4 py-2">{t("adminMarketingTestimonialAuthor")}</th>
                    <th className="text-left px-4 py-2">{t("adminMarketingTestimonialQuote")}</th>
                    <th className="text-left px-4 py-2 w-16">{t("adminMarketingTestimonialRating")}</th>
                    <th className="text-left px-4 py-2 w-24">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {testimonials.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-2 font-medium">{row.authorName}</td>
                      <td className="px-4 py-2 text-muted-foreground max-w-md truncate">{row.quote}</td>
                      <td className="px-4 py-2">{row.rating}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditTm(row);
                              setTmDraft({
                                authorName: row.authorName,
                                quote: row.quote,
                                rating: row.rating,
                                sortOrder: row.sortOrder,
                                published: row.published,
                              });
                            }}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteId(row.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="contact">
          <form onSubmit={saveContact} className="max-w-2xl space-y-4 rounded-xl border border-border bg-card p-6">
            <div>
              <Label>{t("phone")}</Label>
              <p className="text-xs text-muted-foreground mb-1">{t("adminMarketingPhonesHint")}</p>
              <textarea className={cn(textareaClass, "mt-1")} value={phonesText} onChange={(e) => setPhonesText(e.target.value)} />
            </div>
            <div>
              <Label>{t("email")}</Label>
              <p className="text-xs text-muted-foreground mb-1">{t("adminMarketingEmailsHint")}</p>
              <textarea className={cn(textareaClass, "mt-1")} value={emailsText} onChange={(e) => setEmailsText(e.target.value)} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>{t("adminMarketingPrimaryTel")}</Label>
                <Input className="h-10 mt-1" value={primaryTelHref} onChange={(e) => setPrimaryTelHref(e.target.value)} />
              </div>
              <div>
                <Label>{t("adminMarketingPrimaryMail")}</Label>
                <Input className="h-10 mt-1" value={primaryMailtoHref} onChange={(e) => setPrimaryMailtoHref(e.target.value)} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>{t("adminMarketingHoursWeekdays")}</Label>
                <Input className="h-10 mt-1" value={hoursWeekdays} onChange={(e) => setHoursWeekdays(e.target.value)} />
              </div>
              <div>
                <Label>{t("adminMarketingHoursSaturday")}</Label>
                <Input className="h-10 mt-1" value={hoursSaturday} onChange={(e) => setHoursSaturday(e.target.value)} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>{t("adminMarketingFooterLine1")}</Label>
                <Input className="h-10 mt-1" value={footerLine1} onChange={(e) => setFooterLine1(e.target.value)} />
              </div>
              <div>
                <Label>{t("adminMarketingFooterLine2")}</Label>
                <Input className="h-10 mt-1" value={footerLine2} onChange={(e) => setFooterLine2(e.target.value)} />
              </div>
            </div>
            <div className="space-y-3">
              <Label>{t("adminMarketingSocialFb")}</Label>
              <Input className="h-10" value={socialFb} onChange={(e) => setSocialFb(e.target.value)} />
              <Label>{t("adminMarketingSocialIg")}</Label>
              <Input className="h-10" value={socialIg} onChange={(e) => setSocialIg(e.target.value)} />
              <Label>{t("adminMarketingSocialYt")}</Label>
              <Input className="h-10" value={socialYt} onChange={(e) => setSocialYt(e.target.value)} />
              <Label>{t("adminMarketingSocialTt")}</Label>
              <Input className="h-10" value={socialTt} onChange={(e) => setSocialTt(e.target.value)} />
              <Label>{t("adminMarketingSocialWhatsapp")}</Label>
              <p className="text-xs text-muted-foreground mb-1">{t("adminMarketingSocialWhatsappHint")}</p>
              <Input className="h-10" value={socialWhatsapp} onChange={(e) => setSocialWhatsapp(e.target.value)} />
            </div>
            <Button type="submit" className="bg-primary text-primary-foreground">
              {t("adminMarketingSaveContact")}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <AppModal
        open={addOpen || !!editTm}
        onOpenChange={(o) => {
          if (!o) {
            setAddOpen(false);
            setEditTm(null);
          }
        }}
        title={editTm ? t("adminMarketingEditTestimonial") : t("adminMarketingAddTestimonial")}
        footer={
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => (setAddOpen(false), setEditTm(null))}>
              {t("cancel")}
            </Button>
            <Button type="submit" form={testimonialFormId} className="flex-1 bg-primary text-primary-foreground">
              {t("save")}
            </Button>
          </div>
        }
      >
        <form id={testimonialFormId} onSubmit={submitTestimonial} className="space-y-3">
          <div>
            <Label>{t("adminMarketingTestimonialAuthor")}</Label>
            <Input
              className="h-10 mt-1"
              value={tmDraft.authorName}
              onChange={(e) => setTmDraft((d) => ({ ...d, authorName: e.target.value }))}
            />
          </div>
          <div>
            <Label>{t("adminMarketingTestimonialQuote")}</Label>
            <textarea
              className={cn(textareaClass, "mt-1 min-h-[120px]")}
              value={tmDraft.quote}
              onChange={(e) => setTmDraft((d) => ({ ...d, quote: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("adminMarketingTestimonialRating")}</Label>
              <Input
                type="number"
                min={1}
                max={5}
                className="h-10 mt-1"
                value={tmDraft.rating}
                onChange={(e) => setTmDraft((d) => ({ ...d, rating: Number(e.target.value) || 1 }))}
              />
            </div>
            <div>
              <Label>{t("adminMarketingTestimonialOrder")}</Label>
              <Input
                type="number"
                min={0}
                className="h-10 mt-1"
                value={tmDraft.sortOrder}
                onChange={(e) => setTmDraft((d) => ({ ...d, sortOrder: Number(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={tmDraft.published}
              onChange={(e) => setTmDraft((d) => ({ ...d, published: e.target.checked }))}
            />
            {t("adminMarketingTestimonialVisible")}
          </label>
        </form>
      </AppModal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t("delete")}
        description={t("blogDeleteConfirmDesc")}
        confirmLabel={t("delete")}
        danger
      />
    </AdminLayout>
  );
}
