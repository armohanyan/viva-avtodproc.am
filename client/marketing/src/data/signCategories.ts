/** Road-sign category slugs — same order as `questions/client-signs/index.json`. */
export const SIGN_CATEGORY_SLUGS = [
  "nakhazgushacvog-nshanner",
  "arravelutyan-nshanner",
  "argelogh-nshanner",
  "teladrogh-nshanner",
  "hatuk-teladranqi-nshanner",
  "teghekatvutyan-nshanner",
  "spasarkman-nshanner",
  "lracucich-teghekatvutyan",
  "transportayin-mijotsner-chanachman-nshanner",
  "hushumnner",
] as const;

export const SIGNS_CARD_COUNT = SIGN_CATEGORY_SLUGS.length;

export type SignCategorySlug = (typeof SIGN_CATEGORY_SLUGS)[number];

/** UI slot `?topic=1` … `?topic=10` maps to {@link SIGN_CATEGORY_SLUGS}. */
export function signCategorySlugFromSlot(slot: string): string | undefined {
  const n = Number.parseInt(slot.trim(), 10);
  if (!Number.isInteger(n) || n < 1 || n > SIGNS_CARD_COUNT) return undefined;
  return SIGN_CATEGORY_SLUGS[n - 1];
}

export function roadSignsTopicKeyFromSlot(slot: string): string {
  return `road-signs-${slot.trim()}`;
}

export function isRoadSignsSlotTopicKey(topicId: string): boolean {
  const t = topicId.trim();
  if (t === "road-signs-full") return true;
  if (!/^road-signs-\d+$/.test(t)) return false;
  const slot = Number.parseInt(t.slice("road-signs-".length), 10);
  return slot >= 1 && slot <= SIGNS_CARD_COUNT;
}
