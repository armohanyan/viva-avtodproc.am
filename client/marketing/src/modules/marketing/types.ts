export type LocalizedText = { am: string; ru: string; en: string };

export type MarketingPublicDto = {
  stats: { key: string; value: string }[];
  testimonials: { id: string; authorName: LocalizedText; quote: LocalizedText; rating: number }[];
  contact: {
    phones: string[];
    emails: string[];
    hoursWeekdays: string;
    hoursSaturday: string;
    primaryTelHref: string;
    primaryMailtoHref: string;
  };
  footer: { addressLine1: string; addressLine2: string };
  social: { facebook: string; instagram: string; youtube: string; tiktok: string; whatsapp: string };
  siteContent: {
    homeHeroBackgroundImage: string;
    ownerPhoto: string;
    homeIntroTitle: LocalizedText;
    homeIntroDescription: LocalizedText;
    ownerName: LocalizedText;
    ownerPosition: LocalizedText;
    ownerDescription: LocalizedText;
  };
};

export type MarketingTestimonialAdmin = {
  id: string;
  authorName: LocalizedText;
  quote: LocalizedText;
  rating: number;
  sortOrder: number;
  published: boolean;
};

export type MarketingAdminBundle = {
  stats: { key: string; value: string; sortOrder: number }[];
  testimonials: MarketingTestimonialAdmin[];
  contact: MarketingPublicDto["contact"];
  footer: MarketingPublicDto["footer"];
  social: MarketingPublicDto["social"];
  siteContent: MarketingPublicDto["siteContent"];
};
