import DOMPurify from "dompurify";

let blogImgDataUriHookInstalled = false;

function ensureBlogImgDataUriHook(): void {
  if (blogImgDataUriHookInstalled || typeof window === "undefined") return;
  blogImgDataUriHookInstalled = true;
  DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
    if (
      data.attrName === "src" &&
      /^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(data.attrValue)
    ) {
      data.forceKeepAttr = true;
    }
  });
}

/** Escape plain text and wrap paragraphs for legacy plain-text posts. */
/** True if rich text has no visible text (empty editor). */
export function isRichTextEmpty(html: string): boolean {
  const t = html.replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").replace(/\u200b/g, "").trim();
  return t.length === 0;
}

export function plainTextToHtml(text: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const t = text.trim();
  if (!t) return "<p></p>";
  return t
    .split(/\n\n+/)
    .map((block) => `<p>${esc(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

const BLOG_ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "blockquote",
  "span",
] as const;

const BLOG_ALLOWED_ATTR = [
  "href",
  "title",
  "target",
  "rel",
  "class",
  "src",
  "alt",
  "width",
  "height",
] as const;

/** Safe HTML for blog body and excerpts derived from HTML. */
export function sanitizeBlogHtml(html: string): string {
  ensureBlogImgDataUriHook();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...BLOG_ALLOWED_TAGS],
    ALLOWED_ATTR: [...BLOG_ALLOWED_ATTR],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
  });
}

const MAX_COVER_DATA_URL_CHARS = 2_400_000;

export function sanitizeCoverImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const t = url.trim();
  if (!t) return null;
  if (t.startsWith("data:image/")) {
    if (t.length > MAX_COVER_DATA_URL_CHARS) return null;
    return /^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(t) ? t : null;
  }
  if (/^https?:\/\//i.test(t)) {
    try {
      const u = new URL(t);
      if (u.protocol === "http:" || u.protocol === "https:") return t;
    } catch {
      return null;
    }
  }
  /** Same-origin files under the API `/upload` static route (staff images, exam question images). */
  if (t.startsWith("/upload/") && !t.includes("..") && /^\/upload\/(?:[a-z0-9._-]+\/)*[a-z0-9._-]+$/i.test(t)) {
    return t;
  }
  return null;
}
