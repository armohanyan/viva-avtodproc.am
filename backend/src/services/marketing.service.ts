import { MarketingSetting, MarketingStat, MarketingTestimonial } from '../models';

export const STAT_KEYS = ['years_exp', 'students', 'instructors', 'success_rate'] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export type MarketingStatDto = { key: StatKey; value: string; sortOrder: number };
export type LocalizedTextDto = {
  am: string;
  ru: string;
  en: string;
};
export type MarketingTestimonialDto = {
  id: number;
  authorName: LocalizedTextDto;
  quote: LocalizedTextDto;
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

export type MarketingSiteContentDto = {
  homeHeroBackgroundImage: string;
  ownerPhoto: string;
  homeIntroTitle: LocalizedTextDto;
  homeIntroDescription: LocalizedTextDto;
  ownerName: LocalizedTextDto;
  ownerPosition: LocalizedTextDto;
  ownerDescription: LocalizedTextDto;
};

export type MarketingPublicBundle = {
  stats: { key: string; value: string }[];
  testimonials: { id: number; authorName: string; quote: string; rating: number }[];
  contact: MarketingContactDto;
  footer: MarketingFooterDto;
  social: MarketingSocialDto;
  siteContent: MarketingSiteContentDto;
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
  HOME_HERO_BG_IMAGE: 'home_hero_background_image',
  OWNER_PHOTO: 'owner_photo',
  HOME_INTRO_TITLE: 'home_intro_title',
  HOME_INTRO_TITLE_AM: 'home_intro_title_am',
  HOME_INTRO_TITLE_RU: 'home_intro_title_ru',
  HOME_INTRO_TITLE_EN: 'home_intro_title_en',
  HOME_INTRO_DESCRIPTION: 'home_intro_description',
  HOME_INTRO_DESCRIPTION_AM: 'home_intro_description_am',
  HOME_INTRO_DESCRIPTION_RU: 'home_intro_description_ru',
  HOME_INTRO_DESCRIPTION_EN: 'home_intro_description_en',
  OWNER_NAME: 'owner_name',
  OWNER_NAME_AM: 'owner_name_am',
  OWNER_NAME_RU: 'owner_name_ru',
  OWNER_NAME_EN: 'owner_name_en',
  OWNER_POSITION: 'owner_position',
  OWNER_POSITION_AM: 'owner_position_am',
  OWNER_POSITION_RU: 'owner_position_ru',
  OWNER_POSITION_EN: 'owner_position_en',
  OWNER_DESCRIPTION: 'owner_description',
  OWNER_DESCRIPTION_AM: 'owner_description_am',
  OWNER_DESCRIPTION_RU: 'owner_description_ru',
  OWNER_DESCRIPTION_EN: 'owner_description_en',
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

function normalizeLocalizedText(value: unknown): LocalizedTextDto {
  if (typeof value === 'string') {
    return { am: value, ru: value, en: value };
  }
  if (!value || typeof value !== 'object') {
    return { am: '', ru: '', en: '' };
  }
  const candidate = value as Partial<Record<'am' | 'ru' | 'en', unknown>>;
  return {
    am: typeof candidate.am === 'string' ? candidate.am : '',
    ru: typeof candidate.ru === 'string' ? candidate.ru : '',
    en: typeof candidate.en === 'string' ? candidate.en : '',
  };
}

function parseLocalizedFromDb(raw: string): LocalizedTextDto {
  const trimmed = raw.trim();
  if (!trimmed) return { am: '', ru: '', en: '' };
  if (!trimmed.startsWith('{')) {
    return { am: trimmed, ru: trimmed, en: trimmed };
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const normalized = normalizeLocalizedText(parsed);
    if (normalized.am || normalized.ru || normalized.en) return normalized;
  } catch {
    // fall through to legacy string value
  }
  return { am: trimmed, ru: trimmed, en: trimmed };
}

function toDbLocalizedText(value: LocalizedTextDto): string {
  return JSON.stringify(normalizeLocalizedText(value));
}

function getLocalizedSetting(
  map: Map<string, string>,
  keys: { am: string; ru: string; en: string },
  legacyKey?: string,
): LocalizedTextDto {
  const legacy = legacyKey ? getSetting(map, legacyKey) : '';
  return {
    am: getSetting(map, keys.am) || legacy,
    ru: getSetting(map, keys.ru) || legacy,
    en: getSetting(map, keys.en) || legacy,
  };
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
  siteContent: MarketingSiteContentDto;
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
    siteContent: {
      homeHeroBackgroundImage: getSetting(m, SK.HOME_HERO_BG_IMAGE),
      ownerPhoto: getSetting(m, SK.OWNER_PHOTO),
      homeIntroTitle: getLocalizedSetting(
        m,
        { am: SK.HOME_INTRO_TITLE_AM, ru: SK.HOME_INTRO_TITLE_RU, en: SK.HOME_INTRO_TITLE_EN },
        SK.HOME_INTRO_TITLE,
      ),
      homeIntroDescription: getLocalizedSetting(
        m,
        {
          am: SK.HOME_INTRO_DESCRIPTION_AM,
          ru: SK.HOME_INTRO_DESCRIPTION_RU,
          en: SK.HOME_INTRO_DESCRIPTION_EN,
        },
        SK.HOME_INTRO_DESCRIPTION,
      ),
      ownerName: getLocalizedSetting(
        m,
        { am: SK.OWNER_NAME_AM, ru: SK.OWNER_NAME_RU, en: SK.OWNER_NAME_EN },
        SK.OWNER_NAME,
      ),
      ownerPosition: getLocalizedSetting(
        m,
        { am: SK.OWNER_POSITION_AM, ru: SK.OWNER_POSITION_RU, en: SK.OWNER_POSITION_EN },
        SK.OWNER_POSITION,
      ),
      ownerDescription: getLocalizedSetting(
        m,
        { am: SK.OWNER_DESCRIPTION_AM, ru: SK.OWNER_DESCRIPTION_RU, en: SK.OWNER_DESCRIPTION_EN },
        SK.OWNER_DESCRIPTION,
      ),
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
    authorName: parseLocalizedFromDb(r.authorName),
    quote: parseLocalizedFromDb(r.quote),
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
    authorName: LocalizedTextDto;
    quote: LocalizedTextDto;
    rating?: number;
    sortOrder?: number;
    published?: boolean;
  }): Promise<MarketingTestimonialDto> {
    const row = await MarketingTestimonial.create({
      authorName: toDbLocalizedText(input.authorName),
      quote: toDbLocalizedText(input.quote),
      rating: Math.min(5, Math.max(1, input.rating ?? 5)),
      sortOrder: input.sortOrder ?? (await MarketingTestimonial.count()),
      published: input.published ?? true,
    });
    return testimonialToDto(row);
  }

  static async updateTestimonial(
    id: number,
    patch: Partial<{
      authorName: LocalizedTextDto;
      quote: LocalizedTextDto;
      rating: number;
      sortOrder: number;
      published: boolean;
    }>,
  ): Promise<MarketingTestimonialDto | null> {
    const row = await MarketingTestimonial.findByPk(id);
    if (!row) return null;
    await row.update({
      ...(patch.authorName !== undefined ? { authorName: toDbLocalizedText(patch.authorName) } : {}),
      ...(patch.quote !== undefined ? { quote: toDbLocalizedText(patch.quote) } : {}),
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
    siteContent: MarketingSiteContentDto;
  }): Promise<void> {
    const { contact, footer, social, siteContent } = payload;
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
      { settingKey: SK.HOME_HERO_BG_IMAGE, valueText: siteContent.homeHeroBackgroundImage },
      { settingKey: SK.OWNER_PHOTO, valueText: siteContent.ownerPhoto },
      { settingKey: SK.HOME_INTRO_TITLE, valueText: siteContent.homeIntroTitle.am },
      { settingKey: SK.HOME_INTRO_TITLE_AM, valueText: siteContent.homeIntroTitle.am },
      { settingKey: SK.HOME_INTRO_TITLE_RU, valueText: siteContent.homeIntroTitle.ru },
      { settingKey: SK.HOME_INTRO_TITLE_EN, valueText: siteContent.homeIntroTitle.en },
      { settingKey: SK.HOME_INTRO_DESCRIPTION, valueText: siteContent.homeIntroDescription.am },
      { settingKey: SK.HOME_INTRO_DESCRIPTION_AM, valueText: siteContent.homeIntroDescription.am },
      { settingKey: SK.HOME_INTRO_DESCRIPTION_RU, valueText: siteContent.homeIntroDescription.ru },
      { settingKey: SK.HOME_INTRO_DESCRIPTION_EN, valueText: siteContent.homeIntroDescription.en },
      { settingKey: SK.OWNER_NAME, valueText: siteContent.ownerName.am },
      { settingKey: SK.OWNER_NAME_AM, valueText: siteContent.ownerName.am },
      { settingKey: SK.OWNER_NAME_RU, valueText: siteContent.ownerName.ru },
      { settingKey: SK.OWNER_NAME_EN, valueText: siteContent.ownerName.en },
      { settingKey: SK.OWNER_POSITION, valueText: siteContent.ownerPosition.am },
      { settingKey: SK.OWNER_POSITION_AM, valueText: siteContent.ownerPosition.am },
      { settingKey: SK.OWNER_POSITION_RU, valueText: siteContent.ownerPosition.ru },
      { settingKey: SK.OWNER_POSITION_EN, valueText: siteContent.ownerPosition.en },
      { settingKey: SK.OWNER_DESCRIPTION, valueText: siteContent.ownerDescription.am },
      { settingKey: SK.OWNER_DESCRIPTION_AM, valueText: siteContent.ownerDescription.am },
      { settingKey: SK.OWNER_DESCRIPTION_RU, valueText: siteContent.ownerDescription.ru },
      { settingKey: SK.OWNER_DESCRIPTION_EN, valueText: siteContent.ownerDescription.en },
    ];
    for (const u of upserts) {
      await MarketingSetting.upsert(u, { conflictFields: ['settingKey'] });
    }
  }

  static async replaceSettings(payload: {
    contact: MarketingContactDto;
    footer: MarketingFooterDto;
    social: MarketingSocialDto;
    siteContent: MarketingSiteContentDto;
  }): Promise<{
    contact: MarketingContactDto;
    footer: MarketingFooterDto;
    social: MarketingSocialDto;
    siteContent: MarketingSiteContentDto;
  }> {
    await this.replaceSettingsInternal(payload);
    const r = await readContactFooterSocial();
    return r;
  }

  static async getPublicBundle(): Promise<MarketingPublicBundle> {
    const stats = await this.listStats();
    const testimonials = await this.listTestimonialsPublished();
    const { contact, footer, social, siteContent } = await readContactFooterSocial();
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
      siteContent,
    };
  }

  static async getAdminBundle(): Promise<{
    stats: MarketingStatDto[];
    testimonials: MarketingTestimonialDto[];
    contact: MarketingContactDto;
    footer: MarketingFooterDto;
    social: MarketingSocialDto;
    siteContent: MarketingSiteContentDto;
  }> {
    const stats = await this.listStats();
    const testimonials = await this.listTestimonialsAll();
    const { contact, footer, social, siteContent } = await readContactFooterSocial();
    return { stats, testimonials, contact, footer, social, siteContent };
  }
}
