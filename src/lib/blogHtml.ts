import DOMPurify from "dompurify";

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

/** Safe HTML for blog body and excerpts derived from HTML. */
export function sanitizeBlogHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
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
    ALLOWED_ATTR: ["href", "src", "alt", "title", "target", "rel", "class", "width", "height"],
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
  return null;
}
