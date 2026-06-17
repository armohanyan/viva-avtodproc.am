import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl().origin;
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/thematic-questions/quiz/", "/exam-tests/quiz/", "/road-signs/quiz/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
