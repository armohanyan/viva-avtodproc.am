import type { SeoLang } from "./seo";
import { absoluteUrl, siteUrl } from "./site";

const BRAND: Record<SeoLang, string> = {
  en: "Viva Autoschool",
  ru: "Автошкола Viva",
  am: "Վիվա Ավտոդպրոց",
};

const DESCRIPTION: Record<SeoLang, string> = {
  en: "Driving school in Yerevan, Armenia — practical lessons, theory courses, and license exam preparation with certified instructors.",
  ru: "Автошкола в Ереване, Армения — практические уроки, теория и подготовка к экзамену на права с сертифицированными инструкторами.",
  am: "Ավտոդպրոց Երևանում, Հայաստան — պրակտիկ վարորդական դասեր, տեսություն և վարորդական քննության պատրաստում սերտիֆիկացված հրահանգիչների հետ։",
};

/** Organization + DrivingSchool + WebSite graph for the marketing root layout. */
export function buildSiteJsonLd(lang: SeoLang): Record<string, unknown> {
  const origin = siteUrl().origin;
  const name = BRAND[lang];
  const logo = absoluteUrl("/logo.svg");
  const image = absoluteUrl("/home-hero.jpg");

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name,
        url: origin,
        logo: {
          "@type": "ImageObject",
          url: logo,
        },
        image,
        sameAs: [],
      },
      {
        "@type": "DrivingSchool",
        "@id": `${origin}/#drivingschool`,
        name,
        description: DESCRIPTION[lang],
        url: origin,
        image,
        logo,
        parentOrganization: { "@id": `${origin}/#organization` },
        address: {
          "@type": "PostalAddress",
          addressLocality: "Yerevan",
          addressCountry: "AM",
        },
        areaServed: {
          "@type": "Country",
          name: "Armenia",
        },
        priceRange: "$$",
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name,
        url: origin,
        description: DESCRIPTION[lang],
        inLanguage: lang === "am" ? ["hy", "ru", "en"] : lang === "ru" ? ["ru", "hy", "en"] : ["en", "hy", "ru"],
        publisher: { "@id": `${origin}/#organization` },
        about: { "@id": `${origin}/#drivingschool` },
      },
    ],
  };
}

export function buildBlogPostJsonLd(input: {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  coverImage?: string | null;
}): Record<string, unknown> {
  const origin = siteUrl().origin;
  const url = absoluteUrl(`/blogs/${input.slug}`);
  const image = input.coverImage ? absoluteUrl(input.coverImage) : absoluteUrl("/home-hero.jpg");

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.title,
    description: input.description,
    datePublished: input.publishedAt,
    image,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    author: {
      "@type": "Organization",
      name: BRAND.am,
      url: origin,
    },
    publisher: {
      "@type": "Organization",
      name: BRAND.am,
      url: origin,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/logo.svg"),
      },
    },
  };
}
