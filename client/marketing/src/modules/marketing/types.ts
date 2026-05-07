export type MarketingPublicDto = {
  stats: { key: string; value: string }[];
  testimonials: { id: string; authorName: string; quote: string; rating: number }[];
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
};

export type MarketingTestimonialAdmin = {
  id: string;
  authorName: string;
  quote: string;
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
};
