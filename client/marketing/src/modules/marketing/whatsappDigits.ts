/** Normalize admin input (digits or `wa.me` URL) to digits for `https://wa.me/<digits>`. */
export function parseWhatsappDigits(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    if (/wa\.me/i.test(s)) {
      const url = s.startsWith("http://") || s.startsWith("https://") ? s : `https://${s}`;
      const u = new URL(url);
      const digits = u.pathname.replace(/^\//, "").replace(/\D/g, "");
      return digits.length >= 5 ? digits : null;
    }
  } catch {
    /* fall through */
  }
  const n = s.replace(/\D/g, "");
  return n.length >= 5 ? n : null;
}
