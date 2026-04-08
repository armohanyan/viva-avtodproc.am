import sanitizeHtml from "sanitize-html";

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

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
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
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel", "class"],
    img: ["src", "alt", "title", "class", "width", "height"],
    span: ["class"],
    p: ["class"],
    h2: ["class"],
    h3: ["class"],
    h4: ["class"],
    ul: ["class"],
    ol: ["class"],
    li: ["class"],
    blockquote: ["class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: {
    img: ["http", "https", "data"],
    a: ["http", "https", "mailto"],
  },
  allowProtocolRelative: false,
};

/** Safe HTML for blog body and excerpts derived from HTML. */
export function sanitizeBlogHtml(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
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
  return null;
}
