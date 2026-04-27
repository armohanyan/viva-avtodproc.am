import { MarketingSetting, MarketingStat, MarketingTestimonial } from '../models';

export const STAT_KEYS = ['years_exp', 'students', 'instructors', 'success_rate'] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export type MarketingStatDto = { key: StatKey; value: string; sortOrder: number };
export type MarketingTestimonialDto = {
  id: number;
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
  testimonials: { id: number; authorName: string; quote: string; rating: number }[];
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

function parseJsonArray(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function getSetting(map: Map<string, string>, key: string): string {
  return map.get(key)?.trim() ?? '';
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
  const phones = parseJsonArray(m.get(SK.CONTACT_PHONES));
  const emails = parseJsonArray(m.get(SK.CONTACT_EMAILS));
  const primaryTel = getSetting(m, SK.PRIMARY_TEL_HREF);
  const primaryMail = getSetting(m, SK.PRIMARY_MAILTO_HREF);
  return {
    contact: {
      phones,
      emails,
      hoursWeekdays: getSetting(m, SK.HOURS_WEEKDAYS),
      hoursSaturday: getSetting(m, SK.HOURS_SATURDAY),
      primaryTelHref: primaryTel,
      primaryMailtoHref: primaryMail,
    },
    footer: {
      addressLine1: getSetting(m, SK.FOOTER_LINE1),
      addressLine2: getSetting(m, SK.FOOTER_LINE2),
    },
    social: {
      facebook: getSetting(m, SK.SOCIAL_FB),
      instagram: getSetting(m, SK.SOCIAL_IG),
      youtube: getSetting(m, SK.SOCIAL_YT),
      tiktok: getSetting(m, SK.SOCIAL_TT),
      whatsapp: getSetting(m, SK.SOCIAL_WHATSAPP),
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
  static async listStats(): Promise<MarketingStatDto[]> {
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
    const rows = await MarketingTestimonial.findAll({ order: [['sortOrder', 'ASC'], ['id', 'ASC']] });
    return rows.map(testimonialToDto);
  }

  static async listTestimonialsPublished(): Promise<MarketingTestimonialDto[]> {
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
    const row = await MarketingTestimonial.create({
      authorName: input.authorName.trim(),
      quote: input.quote.trim(),
      rating: Math.min(5, Math.max(1, input.rating ?? 5)),
      sortOrder: input.sortOrder ?? (await MarketingTestimonial.count()),
      published: input.published ?? true,
    });
    return testimonialToDto(row);
  }

  static async updateTestimonial(
    id: number,
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

  static async removeTestimonial(id: number): Promise<boolean> {
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
      await MarketingSetting.upsert(u, { conflictFields: ['settingKey'] });
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
    const stats = await this.listStats();
    const testimonials = await this.listTestimonialsAll();
    const { contact, footer, social } = await readContactFooterSocial();
    return { stats, testimonials, contact, footer, social };
  }
}
