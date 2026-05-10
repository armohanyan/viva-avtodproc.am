"use client";

import { FormEvent, useCallback, useEffect, useId, useState } from "react";
import AdminLayout from "src/components/AdminLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import type { LocalizedText, MarketingAdminBundle, MarketingTestimonialAdmin } from "src/modules/marketing/types";
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
import { sameOriginStaffUploadUrl } from "src/lib/sameOriginStaffUploadUrl";
import { uploadStaffImageFile } from "src/lib/staffImageUpload";

const textareaClass = cn(
  "flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none md:text-sm dark:bg-input/30",
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
);

const DEFAULT_STAT_KEYS = Object.keys(MARKETING_STAT_LABEL_KEY);
const MARKETING_IMAGE_MAX_BYTES = 800 * 1024;
const IMAGE_ACCEPT = "image/png,image/jpeg,image/jpg,image/gif,image/webp";

const DEFAULT_HOME_INTRO_TITLE: LocalizedText = { am: "Մեր մասին", ru: "О нас", en: "About Us" };
const DEFAULT_HOME_INTRO_DESCRIPTION: LocalizedText = {
  am: "Viva ավտոդպրոցը օգնում է ուսանողներին սովորել անվտանգ, վստահ և ժամանակակից մեթոդներով։ Մեր նպատակն է պատրաստել պատասխանատու վարորդներ՝ ապահովելով որակյալ տեսական և գործնական ուսուցում։",
  ru: "Автошкола Viva помогает ученикам учиться безопасно, уверенно и современными методами. Наша цель — подготовить ответственных водителей с качественным теоретическим и практическим обучением.",
  en: "Viva Autoschool helps students learn safely and confidently with modern methods. Our goal is to prepare responsible drivers through high-quality theory and practical training.",
};
const DEFAULT_OWNER_NAME: LocalizedText = { am: "[Անուն Ազգանուն]", ru: "[Имя Фамилия]", en: "[Full Name]" };
const DEFAULT_OWNER_POSITION: LocalizedText = {
  am: "Հիմնադիր / Տնօրեն",
  ru: "Основатель / Директор",
  en: "Founder / Director",
};
const DEFAULT_OWNER_DESCRIPTION: LocalizedText = {
  am: "Մեր նպատակն է յուրաքանչյուր ուսանողի տալ ոչ միայն վարորդական գիտելիքներ, այլ նաև վստահություն, պատասխանատվություն և անվտանգ վարելու մշակույթ։",
  ru: "Наша цель — дать каждому ученику не только знания по вождению, но и уверенность, ответственность и культуру безопасного вождения.",
  en: "Our goal is to give every student not only driving knowledge, but also confidence, responsibility, and a culture of safe driving.",
};

const SITE_LANGS: Array<keyof LocalizedText> = ["am", "ru", "en"];
const SITE_LANG_LABEL_KEY: Record<keyof LocalizedText, TranslationKey> = {
  am: "langArmenian",
  ru: "langRussian",
  en: "langEnglish",
};
const EMPTY_LOCALIZED: LocalizedText = { am: "", ru: "", en: "" };

function normalizeStats(stats: MarketingAdminBundle["stats"]): MarketingAdminBundle["stats"] {
  const byKey = new Map(stats.map((row) => [row.key, row]));
  return DEFAULT_STAT_KEYS.map((key, index) => {
    const existing = byKey.get(key);
    return {
      key,
      value: existing?.value ?? "",
      sortOrder: existing?.sortOrder ?? index,
    };
  });
}

function normalizeLocalizedText(value: LocalizedText | null | undefined, fallback: LocalizedText): LocalizedText {
  return {
    am: value?.am ?? fallback.am,
    ru: value?.ru ?? fallback.ru,
    en: value?.en ?? fallback.en,
  };
}

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
  const [homeHeroBackgroundImage, setHomeHeroBackgroundImage] = useState("");
  const [ownerPhoto, setOwnerPhoto] = useState("");
  const [homeIntroTitle, setHomeIntroTitle] = useState<LocalizedText>(DEFAULT_HOME_INTRO_TITLE);
  const [homeIntroDescription, setHomeIntroDescription] = useState<LocalizedText>(DEFAULT_HOME_INTRO_DESCRIPTION);
  const [ownerName, setOwnerName] = useState<LocalizedText>(DEFAULT_OWNER_NAME);
  const [ownerPosition, setOwnerPosition] = useState<LocalizedText>(DEFAULT_OWNER_POSITION);
  const [ownerDescription, setOwnerDescription] = useState<LocalizedText>(DEFAULT_OWNER_DESCRIPTION);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editTm, setEditTm] = useState<MarketingTestimonialAdmin | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [tmDraft, setTmDraft] = useState({
    authorName: { ...EMPTY_LOCALIZED },
    quote: { ...EMPTY_LOCALIZED },
    rating: 5,
    sortOrder: 0,
    published: true,
  });

  const applyBundle = useCallback((b: MarketingAdminBundle) => {
    setStats(normalizeStats(b.stats));
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
    setHomeHeroBackgroundImage(sameOriginStaffUploadUrl(b.siteContent.homeHeroBackgroundImage) ?? "");
    setOwnerPhoto(sameOriginStaffUploadUrl(b.siteContent.ownerPhoto) ?? "");
    setHomeIntroTitle(normalizeLocalizedText(b.siteContent.homeIntroTitle, DEFAULT_HOME_INTRO_TITLE));
    setHomeIntroDescription(normalizeLocalizedText(b.siteContent.homeIntroDescription, DEFAULT_HOME_INTRO_DESCRIPTION));
    setOwnerName(normalizeLocalizedText(b.siteContent.ownerName, DEFAULT_OWNER_NAME));
    setOwnerPosition(normalizeLocalizedText(b.siteContent.ownerPosition, DEFAULT_OWNER_POSITION));
    setOwnerDescription(normalizeLocalizedText(b.siteContent.ownerDescription, DEFAULT_OWNER_DESCRIPTION));
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
        siteContent: MarketingAdminBundle["siteContent"];
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
          siteContent: {
            homeHeroBackgroundImage: homeHeroBackgroundImage.trim(),
            ownerPhoto: ownerPhoto.trim(),
            homeIntroTitle: {
              am: homeIntroTitle.am.trim(),
              ru: homeIntroTitle.ru.trim(),
              en: homeIntroTitle.en.trim(),
            },
            homeIntroDescription: {
              am: homeIntroDescription.am.trim(),
              ru: homeIntroDescription.ru.trim(),
              en: homeIntroDescription.en.trim(),
            },
            ownerName: {
              am: ownerName.am.trim(),
              ru: ownerName.ru.trim(),
              en: ownerName.en.trim(),
            },
            ownerPosition: {
              am: ownerPosition.am.trim(),
              ru: ownerPosition.ru.trim(),
              en: ownerPosition.en.trim(),
            },
            ownerDescription: {
              am: ownerDescription.am.trim(),
              ru: ownerDescription.ru.trim(),
              en: ownerDescription.en.trim(),
            },
          },
        },
      });
      applyBundle({
        stats,
        testimonials,
        ...data,
      });
      showToast(t("blogUpdatedToast"), "success");
    } catch (e) {
      showToast(getApiErrorMessage(e) || t("couldNotLoadData"), "error");
    }
  };

  const uploadMarketingImage = async (file: File | undefined, onSuccess: (url: string) => void) => {
    if (!file) return;
    if (file.size > MARKETING_IMAGE_MAX_BYTES) {
      showToast(t("adminMarketingImageTooLarge"), "error");
      return;
    }
    try {
      const uploadedUrl = await uploadStaffImageFile(file);
      onSuccess(sameOriginStaffUploadUrl(uploadedUrl) ?? uploadedUrl);
    } catch (e) {
      showToast(getApiErrorMessage(e) || t("couldNotLoadData"), "error");
    }
  };

  const openAdd = () => {
    setTmDraft({
      authorName: { ...EMPTY_LOCALIZED },
      quote: { ...EMPTY_LOCALIZED },
      rating: 5,
      sortOrder: testimonials.length,
      published: true,
    });
    setAddOpen(true);
  };

  const submitTestimonial = async (e: FormEvent) => {
    e.preventDefault();
    if (!tmDraft.authorName.am.trim() || !tmDraft.quote.am.trim()) {
      showToast(t("fillRequired"), "error");
      return;
    }
    try {
      if (editTm) {
        await vivaApiJson(`/marketing/testimonials/${encodeURIComponent(editTm.id)}`, {
          method: "PATCH",
          body: {
            authorName: {
              am: tmDraft.authorName.am.trim(),
              ru: tmDraft.authorName.ru.trim(),
              en: tmDraft.authorName.en.trim(),
            },
            quote: {
              am: tmDraft.quote.am.trim(),
              ru: tmDraft.quote.ru.trim(),
              en: tmDraft.quote.en.trim(),
            },
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
            authorName: {
              am: tmDraft.authorName.am.trim(),
              ru: tmDraft.authorName.ru.trim(),
              en: tmDraft.authorName.en.trim(),
            },
            quote: {
              am: tmDraft.quote.am.trim(),
              ru: tmDraft.quote.ru.trim(),
              en: tmDraft.quote.en.trim(),
            },
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

  const localizedInputClass = "space-y-2 rounded-lg border border-border/60 p-3";
  const updateLocalized = (
    setter: (updater: (prev: LocalizedText) => LocalizedText) => void,
    langKey: keyof LocalizedText,
    value: string,
  ) => {
    setter((prev) => ({ ...prev, [langKey]: value }));
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
          <TabsTrigger value="website">{t("adminMarketingWebsiteSection")}</TabsTrigger>
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
                      <td className="px-4 py-2 font-medium">{row.authorName.am || row.authorName.ru || row.authorName.en}</td>
                      <td className="px-4 py-2 text-muted-foreground max-w-md truncate">{row.quote.am || row.quote.ru || row.quote.en}</td>
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

        <TabsContent value="website">
          <form onSubmit={saveContact} className="max-w-3xl space-y-5 rounded-xl border border-border bg-card p-6">
            <div className="space-y-2">
              <Label>{t("adminMarketingHeroBgLabel")}</Label>
              {homeHeroBackgroundImage ? (
                <img src={homeHeroBackgroundImage} alt={t("adminMarketingHeroBgAlt")} className="h-36 w-full rounded-lg object-cover border border-border bg-muted" />
              ) : (
                <div className="h-24 rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
                  {t("adminMarketingHeroBgEmpty")}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept={IMAGE_ACCEPT}
                  className="max-w-xs"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    await uploadMarketingImage(file, setHomeHeroBackgroundImage);
                  }}
                />
                <Button type="button" variant="outline" onClick={() => setHomeHeroBackgroundImage("")}>
                  {t("adminMarketingRemoveImage")}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("adminMarketingHomeIntroTitleLabel")}</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                {SITE_LANGS.map((langKey) => (
                  <div key={`homeIntroTitle-${langKey}`} className={localizedInputClass}>
                    <Label className="text-xs text-muted-foreground">{t(SITE_LANG_LABEL_KEY[langKey])}</Label>
                    <Input
                      className="h-10"
                      value={homeIntroTitle[langKey]}
                      onChange={(e) => updateLocalized(setHomeIntroTitle, langKey, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("adminMarketingHomeIntroDescriptionLabel")}</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                {SITE_LANGS.map((langKey) => (
                  <div key={`homeIntroDescription-${langKey}`} className={localizedInputClass}>
                    <Label className="text-xs text-muted-foreground">{t(SITE_LANG_LABEL_KEY[langKey])}</Label>
                    <textarea
                      className={cn(textareaClass, "min-h-[120px]")}
                      value={homeIntroDescription[langKey]}
                      onChange={(e) => updateLocalized(setHomeIntroDescription, langKey, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("adminMarketingOwnerPhotoLabel")}</Label>
              {ownerPhoto ? (
                <img src={ownerPhoto} alt={t("adminMarketingOwnerPhotoAlt")} className="h-36 w-36 rounded-2xl object-cover border border-border bg-muted" />
              ) : (
                <div className="h-24 rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
                  {t("adminMarketingOwnerPhotoEmpty")}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept={IMAGE_ACCEPT}
                  className="max-w-xs"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    await uploadMarketingImage(file, setOwnerPhoto);
                  }}
                />
                <Button type="button" variant="outline" onClick={() => setOwnerPhoto("")}>
                  {t("adminMarketingRemoveImage")}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("adminMarketingOwnerNameLabel")}</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                {SITE_LANGS.map((langKey) => (
                  <div key={`ownerName-${langKey}`} className={localizedInputClass}>
                    <Label className="text-xs text-muted-foreground">{t(SITE_LANG_LABEL_KEY[langKey])}</Label>
                    <Input
                      className="h-10"
                      value={ownerName[langKey]}
                      onChange={(e) => updateLocalized(setOwnerName, langKey, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("adminMarketingOwnerPositionLabel")}</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                {SITE_LANGS.map((langKey) => (
                  <div key={`ownerPosition-${langKey}`} className={localizedInputClass}>
                    <Label className="text-xs text-muted-foreground">{t(SITE_LANG_LABEL_KEY[langKey])}</Label>
                    <Input
                      className="h-10"
                      value={ownerPosition[langKey]}
                      onChange={(e) => updateLocalized(setOwnerPosition, langKey, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("adminMarketingOwnerDescriptionLabel")}</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                {SITE_LANGS.map((langKey) => (
                  <div key={`ownerDescription-${langKey}`} className={localizedInputClass}>
                    <Label className="text-xs text-muted-foreground">{t(SITE_LANG_LABEL_KEY[langKey])}</Label>
                    <textarea
                      className={cn(textareaClass, "min-h-[120px]")}
                      value={ownerDescription[langKey]}
                      onChange={(e) => updateLocalized(setOwnerDescription, langKey, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" className="bg-primary text-primary-foreground">
              {t("adminMarketingSaveWebsite")}
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
            <div className="mt-1 grid gap-3 sm:grid-cols-3">
              {SITE_LANGS.map((langKey) => (
                <div key={`testimonial-author-${langKey}`} className={localizedInputClass}>
                  <Label className="text-xs text-muted-foreground">{t(SITE_LANG_LABEL_KEY[langKey])}</Label>
                  <Input
                    className="h-10"
                    value={tmDraft.authorName[langKey]}
                    onChange={(e) =>
                      setTmDraft((d) => ({
                        ...d,
                        authorName: { ...d.authorName, [langKey]: e.target.value },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <Label>{t("adminMarketingTestimonialQuote")}</Label>
            <div className="mt-1 grid gap-3 sm:grid-cols-3">
              {SITE_LANGS.map((langKey) => (
                <div key={`testimonial-quote-${langKey}`} className={localizedInputClass}>
                  <Label className="text-xs text-muted-foreground">{t(SITE_LANG_LABEL_KEY[langKey])}</Label>
                  <textarea
                    className={cn(textareaClass, "min-h-[120px]")}
                    value={tmDraft.quote[langKey]}
                    onChange={(e) =>
                      setTmDraft((d) => ({
                        ...d,
                        quote: { ...d.quote, [langKey]: e.target.value },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
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
