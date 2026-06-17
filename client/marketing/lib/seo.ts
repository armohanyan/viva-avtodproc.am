import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { LEGAL_DOCS } from "src/lib/legalDocsContent";
import { siteUrl } from "./site";

export type SeoLang = "en" | "ru" | "am";

type LocalizedText = Record<SeoLang, string>;

type RouteSeo = {
  title: LocalizedText;
  description: LocalizedText;
  keywords: LocalizedText;
};

const BRAND_TITLE: LocalizedText = {
  en: "Viva Autoschool",
  ru: "Автошкола Viva",
  am: "Վիվա Ավտոդպրոց",
};

const DEFAULT_DESCRIPTION: LocalizedText = {
  en: "Driving lessons and theory courses in Armenia. Certified instructors, flexible scheduling, and license exam preparation at Viva Autoschool.",
  ru: "Курсы вождения и теории в Армении. Сертифицированные инструкторы, гибкий график и подготовка к экзамену на права в автошколе Viva.",
  am: "Վարորդական դասեր և տեսական ուսուցում Հայաստանում։ Սերտիֆիկացված հրահանգիչներ, ճկուն գրաֆիկ և վարորդական քննության պատրաստում «Վիվա Ավտոդպրոցում»։",
};

const DEFAULT_KEYWORDS: LocalizedText = {
  en: "driving school Armenia, driving lessons Yerevan, theory exam preparation, driving instructor",
  ru: "автошкола Армения, уроки вождения Ереван, подготовка к теоретическому экзамену, инструктор по вождению",
  am: "ավտոդպրոց Հայաստան, վարորդական դասեր Երևան, տեսական քննության պատրաստում, վարորդական հրահանգիչ",
};

const ROUTE_SEO: Record<string, RouteSeo> = {
  "/": {
    title: {
      en: "Driving Lessons & Theory",
      ru: "Уроки вождения и теория",
      am: "Վարորդական դասեր և տեսություն",
    },
    description: {
      en: "Learn to drive step-by-step with certified instructors. Practical lessons, theory courses, and exam preparation in Yerevan, Armenia.",
      ru: "Освойте вождение шаг за шагом с сертифицированными инструкторами. Практика, теория и подготовка к экзамену в Ереване.",
      am: "Սովորեք վարել քայլ առ քայլ՝ սերտիֆիկացված հրահանգիչների հետ։ Պրակտիկա, տեսություն և քննության պատրաստում Երևանում։",
    },
    keywords: {
      en: "driving school Yerevan, driving lessons Armenia, license preparation, theory courses",
      ru: "автошкола Ереван, уроки вождения Армения, подготовка к правам, курсы теории",
      am: "ավտոդպրոց Երևան, վարորդական դասեր Հայաստան, վարորդական իրավունքի պատրաստում, տեսության դասընթաց",
    },
  },
  "/services": {
    title: { en: "Services", ru: "Услуги", am: "Ծառայություններ" },
    description: {
      en: "Practical driving lessons, theory courses, license preparation, and refresher training — everything you need for your Armenian driver's license.",
      ru: "Практические уроки вождения, теория, подготовка к экзамену и восстановление навыков — все для получения прав в Армении.",
      am: "Պրակտիկ վարորդական դասեր, տեսական ուսուցում, քննության պատրաստում և հմտությունների վերապատրաստում՝ վարորդական իրավունքի համար Հայաստանում։",
    },
    keywords: {
      en: "driving services Armenia, practical driving lessons, theory courses",
      ru: "услуги автошколы Армения, практические уроки вождения, курсы теории",
      am: "ավտոդպրոցի ծառայություններ Հայաստան, պրակտիկ վարորդական դասեր, տեսության դասընթացներ",
    },
  },
  "/about": {
    title: { en: "About Us", ru: "О нас", am: "Մեր մասին" },
    description: {
      en: "Viva Driving School — Armenia's trusted driving education center since 2010. Certified instructors, modern vehicles, and student-centered training.",
      ru: "Автошкола Viva — надежный учебный центр Армении с 2010 года. Сертифицированные инструкторы и современные автомобили.",
      am: "«Վիվա Ավտոդպրոց»՝ Հայաստանի վստահելի վարորդական ուսուցման կենտրոն 2010-ից։ Սերտիֆիկացված հրահանգիչներ և ժամանակակից մեքենաներ։",
    },
    keywords: {
      en: "about viva autoschool, driving school history Armenia",
      ru: "о автошколе viva, история автошколы Армения",
      am: "վիվա ավտոդպրոցի մասին, ավտոդպրոցի պատմություն Հայաստան",
    },
  },
  "/packages": {
    title: {
      en: "Packages & Pricing",
      ru: "Пакеты и цены",
      am: "Փաթեթներ և գներ",
    },
    description: {
      en: "Compare driving lesson packages at Viva Autoschool — flexible options for practical training and theory included.",
      ru: "Сравните пакеты уроков вождения в автошколе Viva — гибкие варианты практики и теории.",
      am: "Համեմատեք «Վիվա Ավտոդպրոցի» վարորդական դասերի փաթեթները՝ ճկուն տարբերակներով և ներառված տեսությամբ։",
    },
    keywords: {
      en: "driving lesson packages, autoschool pricing Armenia",
      ru: "пакеты уроков вождения, цены автошколы Армения",
      am: "վարորդական դասերի փաթեթներ, ավտոդպրոցի գներ Հայաստան",
    },
  },
  "/instructors": {
    title: { en: "Instructors", ru: "Инструкторы", am: "Հրահանգիչներ" },
    description: {
      en: "Meet our certified driving instructors — patient, professional, and focused on safe, confident drivers.",
      ru: "Познакомьтесь с нашими сертифицированными инструкторами по вождению — терпеливыми и профессиональными.",
      am: "Ծանոթացեք մեր սերտիֆիկացված վարորդական հրահանգիչներին՝ համբերատար և պրոֆեսիոնալ թիմ։",
    },
    keywords: {
      en: "driving instructors Yerevan, certified instructor Armenia",
      ru: "инструкторы по вождению Ереван, сертифицированный инструктор Армения",
      am: "վարորդական հրահանգիչներ Երևան, սերտիֆիկացված հրահանգիչ Հայաստան",
    },
  },
  "/contact": {
    title: { en: "Contact", ru: "Контакты", am: "Կապ" },
    description: {
      en: "Contact Viva Autoschool in Yerevan — phone, email, branches, and lesson booking information.",
      ru: "Свяжитесь с автошколой Viva в Ереване — телефон, email, филиалы и запись на уроки.",
      am: "Կապ հաստատեք «Վիվա Ավտոդպրոցի» հետ Երևանում՝ հեռախոս, էլ․փոստ, մասնաճյուղեր և դասերի ամրագրում։",
    },
    keywords: {
      en: "contact driving school, autoschool branches Yerevan",
      ru: "контакты автошколы, филиалы автошколы Ереван",
      am: "ավտոդպրոցի կոնտակտներ, ավտոդպրոցի մասնաճյուղեր Երևան",
    },
  },
  "/blogs": {
    title: { en: "Blog", ru: "Блог", am: "Բլոգ" },
    description: {
      en: "Driving tips, theory exam preparation, and updates from Viva Autoschool.",
      ru: "Советы по вождению, подготовка к теории и новости автошколы Viva.",
      am: "Վարելու խորհուրդներ, տեսական քննության պատրաստում և «Վիվա Ավտոդպրոցի» նորություններ։",
    },
    keywords: {
      en: "driving blog Armenia, theory test tips",
      ru: "блог о вождении Армения, советы к теоретическому экзамену",
      am: "վարորդական բլոգ Հայաստան, տեսական քննության խորհուրդներ",
    },
  },
  "/exam-tests": {
    title: {
      en: "Exam Tests",
      ru: "Экзаменационные тесты",
      am: "Քննության թեստեր",
    },
    description: {
      en: "Thematic questions and exam-style practice for your driving theory test.",
      ru: "Тематические вопросы и практика в формате экзамена по теории вождения.",
      am: "Թեմատիկ հարցեր և քննության ձևաչափով պրակտիկա վարորդական տեսական քննության համար։",
    },
    keywords: {
      en: "driving theory tests Armenia, exam practice questions",
      ru: "тесты по теории вождения Армения, вопросы для практики экзамена",
      am: "վարորդական տեսության թեստեր Հայաստան, քննության պրակտիկ հարցեր",
    },
  },
  "/road-signs": {
    title: {
      en: "Road Signs",
      ru: "Дорожные знаки",
      am: "Ճանապարհային նշաններ",
    },
    description: {
      en: "Learn Armenian road signs by category and practice with image-based quizzes.",
      ru: "Изучайте дорожные знаки Армении по категориям и практикуйтесь с тестами по картинкам.",
      am: "Ուսուցեք հայկական ճանապարհային նշանները ըստ խմբերի և պրակտիկա անցեք պատկերներով թեստերով։",
    },
    keywords: {
      en: "Armenia road signs, driving theory signs practice",
      ru: "дорожные знаки Армения, практика знаков теории вождения",
      am: "ճանապարհային նշաններ Հայաստան, վարորդական տեսության նշանների պրակտիկա",
    },
  },
  "/thematic-questions": {
    title: {
      en: "Exam Tests & Topic Practice",
      ru: "Тесты и практика по темам",
      am: "Թեստեր և թեմատիկ պրակտիկա",
    },
    description: {
      en: "Practice thematic driving theory questions, track progress, and prepare for the official exam with Viva Autoschool.",
      ru: "Практикуйте тематические вопросы по теории, отслеживайте прогресс и готовьтесь к официальному экзамену.",
      am: "Վարժվեք տեսական թեմատիկ հարցերով, հետևեք առաջընթացին և պատրաստվեք պաշտոնական քննությանը «Վիվա Ավտոդպրոցի» հետ։",
    },
    keywords: {
      en: "thematic driving questions, theory topic practice Armenia",
      ru: "тематические вопросы по вождению, практика тем по теории Армения",
      am: "տեսական թեմատիկ հարցեր, վարորդական թեմատիկ պրակտիկա Հայաստան",
    },
  },
};

function normalizeSeoLang(value: string | null | undefined): SeoLang | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  if (normalized === "ru" || normalized.startsWith("ru-")) return "ru";
  if (normalized === "am" || normalized.startsWith("am-") || normalized === "hy" || normalized.startsWith("hy-")) {
    return "am";
  }
  return null;
}

export async function getRequestSeoLang(): Promise<SeoLang> {
  const cookieStore = await cookies();
  const langFromCookie = normalizeSeoLang(cookieStore.get("viva_lang")?.value);
  if (langFromCookie) return langFromCookie;

  const headerStore = await headers();
  const langFromHeader = normalizeSeoLang(headerStore.get("accept-language"));
  return langFromHeader ?? "am";
}

export function getRouteSeo(pathname: string, lang: SeoLang): { title: string; description: string; keywords: string } {
  const routeSeo = ROUTE_SEO[pathname];
  if (!routeSeo) {
    return {
      title: BRAND_TITLE[lang],
      description: DEFAULT_DESCRIPTION[lang],
      keywords: DEFAULT_KEYWORDS[lang],
    };
  }
  return {
    title: routeSeo.title[lang],
    description: routeSeo.description[lang],
    keywords: routeSeo.keywords[lang],
  };
}

export function buildRouteMetadata(pathname: string, lang: SeoLang): Metadata {
  const seo = getRouteSeo(pathname, lang);
  const canonical = pathname === "/" ? "/" : pathname;
  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: { canonical },
    openGraph: {
      type: "website",
      siteName: BRAND_TITLE[lang],
      title: seo.title,
      description: seo.description,
      url: canonical,
      locale: lang === "am" ? "hy_AM" : lang === "ru" ? "ru_RU" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
  };
}

export function legalMetadata(kind: "privacy" | "terms" | "payments", lang: SeoLang, pathname: string): Metadata {
  const doc = LEGAL_DOCS[kind][lang];
  return {
    ...buildRouteMetadata(pathname, lang),
    title: doc.pageTitle,
    description: doc.metaDescription,
    openGraph: {
      ...(buildRouteMetadata(pathname, lang).openGraph ?? {}),
      title: doc.pageTitle,
      description: doc.metaDescription,
    },
    twitter: {
      ...(buildRouteMetadata(pathname, lang).twitter ?? {}),
      title: doc.pageTitle,
      description: doc.metaDescription,
    },
  };
}

export function baseLayoutMetadata(lang: SeoLang): Metadata {
  return {
    metadataBase: siteUrl(),
    icons: {
      icon: [{ url: "/favicon.png", type: "image/png" }],
      shortcut: ["/favicon.png"],
      apple: ["/favicon.png"],
    },
    title: {
      default: BRAND_TITLE[lang],
      template: `%s | ${BRAND_TITLE[lang]}`,
    },
    description: DEFAULT_DESCRIPTION[lang],
    keywords: DEFAULT_KEYWORDS[lang],
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: BRAND_TITLE[lang],
      title: BRAND_TITLE[lang],
      description: DEFAULT_DESCRIPTION[lang],
      locale: lang === "am" ? "hy_AM" : lang === "ru" ? "ru_RU" : "en_US",
      url: "/",
    },
    twitter: {
      card: "summary_large_image",
      title: BRAND_TITLE[lang],
      description: DEFAULT_DESCRIPTION[lang],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
  };
}
