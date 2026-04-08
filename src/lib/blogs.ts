import { plainTextToHtml, sanitizeBlogHtml, sanitizeCoverImageUrl } from "src/lib/blogHtml";

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

const STORAGE_KEY = "viva.blogs.v2";
const LEGACY_STORAGE_KEY = "viva.blogs.v1";

const SEED: Blog[] = [
  {
    id: "blog-seed-1",
    slug: "tips-for-your-first-driving-lesson",
    title: "Tips for your first driving lesson",
    excerpt: "What to bring, what to expect, and how to get the most from your first session with an instructor.",
    bodyHtml:
      "<p>Your first lesson sets the tone for your training. Arrive rested, wear comfortable shoes, and bring your learner permit if you already have one.</p>" +
      "<p>Listen carefully to vehicle controls and ask questions early — your instructor prefers clarifying doubts before you move. Stay calm: mistakes are part of learning.</p>" +
      "<p>After the lesson, note what felt difficult so you can focus on it next time.</p>",
    coverImage: null,
    published: true,
    publishedAt: "2026-01-10T09:00:00.000Z",
  },
  {
    id: "blog-seed-2",
    slug: "theory-exam-how-to-prepare",
    title: "Theory exam: how to prepare effectively",
    excerpt: "A practical study plan using topic practice, mock exams, and spaced repetition.",
    bodyHtml:
      "<p>Mix full mock exams with focused topic sessions. Review every wrong answer and read the explanation, not just the correct option.</p>" +
      "<p>Short daily sessions beat rare long cramming. Use road sign drills until recognition is instant.</p>" +
      "<p>When you consistently pass mocks under time pressure, you are ready for the official test.</p>",
    coverImage: null,
    published: true,
    publishedAt: "2026-02-01T12:00:00.000Z",
  },
];

function slugify(input: string): string {
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

function parseStored(raw: unknown): Blog[] {
  if (!Array.isArray(raw)) return [];
  const out: Blog[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.title !== "string" || typeof o.slug !== "string") continue;
    const legacyBody = typeof o.body === "string" ? o.body : "";
    let bodyHtml = typeof o.bodyHtml === "string" ? o.bodyHtml : "";
    if (!bodyHtml.trim() && legacyBody) {
      bodyHtml = plainTextToHtml(legacyBody);
    }
    if (!bodyHtml.trim()) bodyHtml = "<p></p>";
    const cover =
      typeof o.coverImage === "string" && o.coverImage.trim() ? o.coverImage.trim() : null;
    out.push({
      id: o.id,
      slug: o.slug,
      title: o.title,
      excerpt: typeof o.excerpt === "string" ? o.excerpt : "",
      bodyHtml,
      coverImage: cover,
      published: Boolean(o.published),
      publishedAt: typeof o.publishedAt === "string" ? o.publishedAt : new Date().toISOString(),
    });
  }
  return out;
}

function readKey(key: string): Blog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    return parseStored(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

function writeAll(blogs: Blog[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(blogs));
  window.dispatchEvent(new CustomEvent("viva-blogs-updated"));
}

function migrateLegacyIfNeeded(): Blog[] {
  const current = readKey(STORAGE_KEY);
  if (current.length > 0) return current;
  const legacy = readKey(LEGACY_STORAGE_KEY);
  if (legacy.length === 0) return [];
  writeAll(legacy);
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return legacy;
}

/** All posts (admin). Seeds once if storage is empty. */
export function loadBlogs(): Blog[] {
  let list = migrateLegacyIfNeeded();
  if (list.length === 0) {
    list = [...SEED];
    writeAll(list);
  }
  return list.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export function loadPublishedBlogs(): Blog[] {
  return loadBlogs()
    .filter((b) => b.published)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export function getBlogBySlug(slug: string): Blog | undefined {
  return loadBlogs().find((b) => b.slug === slug && b.published);
}

/** Server / SSG-safe: seed posts only (no localStorage). For Next.js metadata. */
export function getSeedBlogBySlug(slug: string): Blog | undefined {
  return SEED.find((b) => b.slug === slug && b.published);
}

export function getPublishedSeedBlogSlugs(): string[] {
  return SEED.filter((b) => b.published).map((b) => b.slug);
}

export { slugify };

export function createBlog(input: {
  title: string;
  excerpt: string;
  bodyHtml: string;
  coverImage?: string | null;
  published: boolean;
  publishedAt?: string;
}): Blog {
  const all = loadBlogs();
  const id = `blog-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const slug = ensureUniqueSlug(slugify(input.title.trim()), all);
  const publishedAt = input.publishedAt ?? new Date().toISOString();
  const blog: Blog = {
    id,
    slug,
    title: input.title.trim(),
    excerpt: input.excerpt.trim(),
    bodyHtml: sanitizeBlogHtml(input.bodyHtml) || "<p></p>",
    coverImage: sanitizeCoverImageUrl(input.coverImage ?? null),
    published: input.published,
    publishedAt,
  };
  writeAll([blog, ...all]);
  return blog;
}

export function updateBlog(blog: Blog): void {
  const all = loadBlogs();
  const slug = ensureUniqueSlug(slugify(blog.title.trim()), all, blog.id);
  const next: Blog = {
    ...blog,
    slug,
    title: blog.title.trim(),
    excerpt: blog.excerpt.trim(),
    bodyHtml: sanitizeBlogHtml(blog.bodyHtml) || "<p></p>",
    coverImage: sanitizeCoverImageUrl(blog.coverImage),
  };
  writeAll(all.map((b) => (b.id === next.id ? next : b)));
}

export function deleteBlog(id: string): void {
  const all = loadBlogs();
  writeAll(all.filter((b) => b.id !== id));
}
