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

/** Public URL segment: lowercase Latin letters, digits, hyphens only. */
const BLOG_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Build an ASCII URL slug from a title.
 * Non-Latin letters (e.g. Armenian) are stripped so titles in those scripts
 * do not become fragile Unicode path segments — enter an English slug in admin.
 */
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return (base || "post").slice(0, 120);
}

/** Normalize admin input into a candidate slug (does not guarantee validity). */
export function normalizeBlogSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

export function isValidBlogSlug(slug: string): boolean {
  return BLOG_SLUG_RE.test(slug) && slug.length <= 120;
}

export function ensureUniqueSlug(slug: string, blogs: Blog[], excludeId?: string): string {
  let s = slug || "post";
  let n = 0;
  const exclude = excludeId != null ? String(excludeId) : undefined;
  while (blogs.some((b) => b.slug === s && String(b.id) !== exclude)) {
    n += 1;
    s = `${slug || "post"}-${n}`;
  }
  return s;
}
