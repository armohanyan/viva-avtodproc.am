import { MarketingSetting, MarketingStat, MarketingTestimonial } from '../models';

export const STAT_KEYS = ['years_exp', 'students', 'instructors', 'success_rate'] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export type MarketingStatDto = { key: StatKey; value: string; sortOrder: number };
export type MarketingTestimonialDto = {
  id: string;
  authorName: string;
  quote: string;
  rating: number;
  sortOrder: number;
  published: boolean;
};

export type MarketingContactDto = {
  phones: string[];
  emails: string[];
  hoursWeekdays: string;
  hoursSaturday: string;
  primaryTelHref: string;
  primaryMailtoHref: string;
};

export type MarketingFooterDto = { addressLine1: string; addressLine2: string };
export type MarketingSocialDto = {
  facebook: string;
  instagram: string;
  youtube: string;
  tiktok: string;
  /** Digits (country code, no +) or full `https://wa.me/...` — used for floating WhatsApp; empty hides the button. */
  whatsapp: string;
};

export type MarketingPublicBundle = {
  stats: { key: string; value: string }[];
  testimonials: { id: string; authorName: string; quote: string; rating: number }[];
  contact: MarketingContactDto;
  footer: MarketingFooterDto;
  social: MarketingSocialDto;
};

const SK = {
  CONTACT_PHONES: 'contact_phones',
  CONTACT_EMAILS: 'contact_emails',
  HOURS_WEEKDAYS: 'contact_hours_weekdays',
  HOURS_SATURDAY: 'contact_hours_saturday',
  PRIMARY_TEL_HREF: 'contact_primary_tel_href',
  PRIMARY_MAILTO_HREF: 'contact_primary_mailto_href',
  FOOTER_LINE1: 'footer_address_line1',
  FOOTER_LINE2: 'footer_address_line2',
  SOCIAL_FB: 'social_facebook_url',
  SOCIAL_IG: 'social_instagram_url',
  SOCIAL_YT: 'social_youtube_url',
  SOCIAL_TT: 'social_tiktok_url',
  SOCIAL_WHATSAPP: 'social_whatsapp',
} as const;

const DEFAULT_STATS: MarketingStatDto[] = [
  { key: 'years_exp', value: '14+', sortOrder: 0 },
  { key: 'students', value: '3,200+', sortOrder: 1 },
  { key: 'instructors', value: '18', sortOrder: 2 },
  { key: 'success_rate', value: '94%', sortOrder: 3 },
];

function parseJsonArray(raw: string | undefined, fallback: string[]): string[] {
  if (!raw?.trim()) return fallback;
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.map(String) : fallback;
  } catch {
    return fallback;
  }
}

function getSetting(map: Map<string, string>, key: string, fallback: string): string {
  return map.get(key)?.trim() || fallback;
}

async function loadSettingsMap(): Promise<Map<string, string>> {
  const rows = await MarketingSetting.findAll();
  const m = new Map<string, string>();
  for (const r of rows) {
    m.set(r.settingKey, r.valueText);
  }
  return m;
}

async function readContactFooterSocial(): Promise<{
  contact: MarketingContactDto;
  footer: MarketingFooterDto;
  social: MarketingSocialDto;
}> {
  const m = await loadSettingsMap();
  const phones = parseJsonArray(m.get(SK.CONTACT_PHONES), ['+374 10 123 456', '+374 99 123 456']);
  const emails = parseJsonArray(m.get(SK.CONTACT_EMAILS), ['info@vivadrive.am', 'support@vivadrive.am']);
  const primaryTel = getSetting(m, SK.PRIMARY_TEL_HREF, 'tel:+37410123456');
  const primaryMail = getSetting(m, SK.PRIMARY_MAILTO_HREF, 'mailto:info@vivadrive.am');
  return {
    contact: {
      phones,
      emails,
      hoursWeekdays: getSetting(m, SK.HOURS_WEEKDAYS, 'Mon–Fri: 9:00–18:00'),
      hoursSaturday: getSetting(m, SK.HOURS_SATURDAY, 'Sat: 9:00–15:00'),
      primaryTelHref: primaryTel,
      primaryMailtoHref: primaryMail,
    },
    footer: {
      addressLine1: getSetting(m, SK.FOOTER_LINE1, 'Yerevan, Armenia'),
      addressLine2: getSetting(m, SK.FOOTER_LINE2, 'Mashtots Ave, 45'),
    },
    social: {
      facebook: getSetting(m, SK.SOCIAL_FB, 'https://facebook.com'),
      instagram: getSetting(m, SK.SOCIAL_IG, 'https://instagram.com'),
      youtube: getSetting(m, SK.SOCIAL_YT, 'https://youtube.com'),
      tiktok: getSetting(m, SK.SOCIAL_TT, 'https://www.tiktok.com'),
      whatsapp: getSetting(m, SK.SOCIAL_WHATSAPP, ''),
    },
  };
}

function statRowToDto(r: MarketingStat): MarketingStatDto {
  return {
    key: r.statKey as StatKey,
    value: r.value,
    sortOrder: r.sortOrder,
  };
}

function testimonialToDto(r: MarketingTestimonial): MarketingTestimonialDto {
  return {
    id: r.id,
    authorName: r.authorName,
    quote: r.quote,
    rating: r.rating,
    sortOrder: r.sortOrder,
    published: r.published,
  };
}

export default class MarketingService {
  static async ensureDefaultStatsIfEmpty(): Promise<void> {
    const n = await MarketingStat.count();
    if (n > 0) return;
    await MarketingStat.bulkCreate(
      DEFAULT_STATS.map((s) => ({
        statKey: s.key,
        value: s.value,
        sortOrder: s.sortOrder,
      })),
    );
  }

  static async ensureDefaultSettingsIfEmpty(): Promise<void> {
    const n = await MarketingSetting.count();
    if (n > 0) return;
    const { contact, footer, social } = await readContactFooterSocial();
    await this.replaceSettingsInternal({ contact, footer, social });
  }

  static async ensureDefaultTestimonialsIfEmpty(): Promise<void> {
    const n = await MarketingTestimonial.count();
    if (n > 0) return;
    await MarketingTestimonial.bulkCreate([
      {
        id: 'mt-seed-1',
        authorName: 'Anahit K.',
        quote:
          'Passed my exam on the first try! The instructors are incredibly patient and professional.',
        rating: 5,
        sortOrder: 0,
        published: true,
      },
      {
        id: 'mt-seed-2',
        authorName: 'Tigran M.',
        quote: 'Great experience from start to finish. The booking system made it so easy to schedule lessons.',
        rating: 5,
        sortOrder: 1,
        published: true,
      },
      {
        id: 'mt-seed-3',
        authorName: 'Mariam S.',
        quote: 'I was terrified of driving but Viva helped me become confident behind the wheel.',
        rating: 5,
        sortOrder: 2,
        published: true,
      },
    ]);
  }

  static async ensureMarketingDefaults(): Promise<void> {
    await this.ensureDefaultStatsIfEmpty();
    await this.ensureDefaultSettingsIfEmpty();
    await this.ensureDefaultTestimonialsIfEmpty();
  }

  static async listStats(): Promise<MarketingStatDto[]> {
    await this.ensureDefaultStatsIfEmpty();
    const rows = await MarketingStat.findAll({ order: [['sortOrder', 'ASC']] });
    return rows.map(statRowToDto);
  }

  static async replaceStats(stats: { key: string; value: string; sortOrder?: number }[]): Promise<MarketingStatDto[]> {
    const normalized = stats
      .filter((s) => STAT_KEYS.includes(s.key as StatKey))
      .map((s, i) => ({
        statKey: s.key as StatKey,
        value: s.value.slice(0, 64),
        sortOrder: s.sortOrder ?? i,
      }));
    if (normalized.length === 0) {
      return this.listStats();
    }
    await MarketingStat.destroy({ where: {} });
    await MarketingStat.bulkCreate(normalized);
    return this.listStats();
  }

  static async listTestimonialsAll(): Promise<MarketingTestimonialDto[]> {
    await this.ensureDefaultTestimonialsIfEmpty();
    const rows = await MarketingTestimonial.findAll({ order: [['sortOrder', 'ASC'], ['id', 'ASC']] });
    return rows.map(testimonialToDto);
  }

  static async listTestimonialsPublished(): Promise<MarketingTestimonialDto[]> {
    await this.ensureDefaultTestimonialsIfEmpty();
    const rows = await MarketingTestimonial.findAll({
      where: { published: true },
      order: [['sortOrder', 'ASC'], ['id', 'ASC']],
    });
    return rows.map(testimonialToDto);
  }

  static async createTestimonial(input: {
    authorName: string;
    quote: string;
    rating?: number;
    sortOrder?: number;
    published?: boolean;
  }): Promise<MarketingTestimonialDto> {
    const id = `mt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const row = await MarketingTestimonial.create({
      id,
      authorName: input.authorName.trim(),
      quote: input.quote.trim(),
      rating: Math.min(5, Math.max(1, input.rating ?? 5)),
      sortOrder: input.sortOrder ?? (await MarketingTestimonial.count()),
      published: input.published ?? true,
    });
    return testimonialToDto(row);
  }

  static async updateTestimonial(
    id: string,
    patch: Partial<{
      authorName: string;
      quote: string;
      rating: number;
      sortOrder: number;
      published: boolean;
    }>,
  ): Promise<MarketingTestimonialDto | null> {
    const row = await MarketingTestimonial.findByPk(id);
    if (!row) return null;
    await row.update({
      ...(patch.authorName !== undefined ? { authorName: patch.authorName.trim() } : {}),
      ...(patch.quote !== undefined ? { quote: patch.quote.trim() } : {}),
      ...(patch.rating !== undefined
        ? { rating: Math.min(5, Math.max(1, Math.floor(patch.rating))) }
        : {}),
      ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}),
      ...(patch.published !== undefined ? { published: patch.published } : {}),
    });
    return testimonialToDto(row);
  }

  static async removeTestimonial(id: string): Promise<boolean> {
    const n = await MarketingTestimonial.destroy({ where: { id } });
    return n > 0;
  }

  static async replaceSettingsInternal(payload: {
    contact: MarketingContactDto;
    footer: MarketingFooterDto;
    social: MarketingSocialDto;
  }): Promise<void> {
    const { contact, footer, social } = payload;
    const upserts: Array<{ settingKey: string; valueText: string }> = [
      { settingKey: SK.CONTACT_PHONES, valueText: JSON.stringify(contact.phones) },
      { settingKey: SK.CONTACT_EMAILS, valueText: JSON.stringify(contact.emails) },
      { settingKey: SK.HOURS_WEEKDAYS, valueText: contact.hoursWeekdays },
      { settingKey: SK.HOURS_SATURDAY, valueText: contact.hoursSaturday },
      { settingKey: SK.PRIMARY_TEL_HREF, valueText: contact.primaryTelHref },
      { settingKey: SK.PRIMARY_MAILTO_HREF, valueText: contact.primaryMailtoHref },
      { settingKey: SK.FOOTER_LINE1, valueText: footer.addressLine1 },
      { settingKey: SK.FOOTER_LINE2, valueText: footer.addressLine2 },
      { settingKey: SK.SOCIAL_FB, valueText: social.facebook },
      { settingKey: SK.SOCIAL_IG, valueText: social.instagram },
      { settingKey: SK.SOCIAL_YT, valueText: social.youtube },
      { settingKey: SK.SOCIAL_TT, valueText: social.tiktok },
      { settingKey: SK.SOCIAL_WHATSAPP, valueText: social.whatsapp },
    ];
    for (const u of upserts) {
      await MarketingSetting.upsert(u);
    }
  }

  static async replaceSettings(payload: {
    contact: MarketingContactDto;
    footer: MarketingFooterDto;
    social: MarketingSocialDto;
  }): Promise<{ contact: MarketingContactDto; footer: MarketingFooterDto; social: MarketingSocialDto }> {
    await this.replaceSettingsInternal(payload);
    const r = await readContactFooterSocial();
    return r;
  }

  static async getPublicBundle(): Promise<MarketingPublicBundle> {
    await this.ensureMarketingDefaults();
    const stats = await this.listStats();
    const testimonials = await this.listTestimonialsPublished();
    const { contact, footer, social } = await readContactFooterSocial();
    return {
      stats: stats.map((s) => ({ key: s.key, value: s.value })),
      testimonials: testimonials.map((t) => ({
        id: t.id,
        authorName: t.authorName,
        quote: t.quote,
        rating: t.rating,
      })),
      contact,
      footer,
      social,
    };
  }

  static async getAdminBundle(): Promise<{
    stats: MarketingStatDto[];
    testimonials: MarketingTestimonialDto[];
    contact: MarketingContactDto;
    footer: MarketingFooterDto;
    social: MarketingSocialDto;
  }> {
    await this.ensureMarketingDefaults();
    const stats = await this.listStats();
    const testimonials = await this.listTestimonialsAll();
    const { contact, footer, social } = await readContactFooterSocial();
    return { stats, testimonials, contact, footer, social };
  }
}
