/** Blog post shape (matches backend `BlogDto` / DB). */
export interface Blog {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  /** Sanitized HTML from rich text editor */
  bodyHtml: string;
  /** Optional cover image (data URL or https URL) */
  coverImage: string | null;
  published: boolean;
  publishedAt: string;
}

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return (base || "post").slice(0, 120);
}

export function ensureUniqueSlug(slug: string, blogs: Blog[], excludeId?: string): string {
  let s = slug || "post";
  let n = 0;
  while (blogs.some((b) => b.slug === s && b.id !== excludeId)) {
    n += 1;
    s = `${slug || "post"}-${n}`;
  }
  return s;
}
