import type { MetadataRoute } from "next";
import { fetchPublishedBlogSlugsApi } from "src/lib/blogsApi";
import { siteUrl } from "@/lib/site";

const staticPaths = [
  "/",
  "/about",
  "/services",
  "/packages",
  "/instructors",
  "/blogs",
  "/contact",
  "/thematic-questions",
  "/exam-tests",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl().origin;
  const lastModified = new Date();
  const entries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${base}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency: path === "/blogs" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.8,
  }));
  const slugs = await fetchPublishedBlogSlugsApi();
  for (const slug of slugs) {
    entries.push({
      url: `${base}/blogs/${slug}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }
  return entries;
}
