import type { MetadataRoute } from "next";
import { fetchPublishedBlogSlugsApi } from "src/lib/blogsApi";
import { siteUrl } from "@/lib/site";

const staticPaths: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/about", changeFrequency: "monthly", priority: 0.9 },
  { path: "/services", changeFrequency: "monthly", priority: 0.9 },
  { path: "/packages", changeFrequency: "weekly", priority: 0.9 },
  { path: "/instructors", changeFrequency: "monthly", priority: 0.8 },
  { path: "/blogs", changeFrequency: "weekly", priority: 0.8 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.9 },
  { path: "/thematic-questions", changeFrequency: "weekly", priority: 0.85 },
  { path: "/exam-tests", changeFrequency: "weekly", priority: 0.85 },
  { path: "/road-signs", changeFrequency: "weekly", priority: 0.85 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/payments-and-refunds", changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl().origin;
  const lastModified = new Date();
  const entries: MetadataRoute.Sitemap = staticPaths.map(({ path, changeFrequency, priority }) => ({
    url: `${base}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
  const slugs = await fetchPublishedBlogSlugsApi();
  for (const slug of slugs) {
    entries.push({
      url: `${base}/blogs/${encodeURIComponent(slug)}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }
  return entries;
}
