import { isVisibleSignSlot } from "src/data/signCategories";

export type RoadSignCopy = {
  title: string;
  /** Text after the first line. Empty when the source only names the sign. */
  body: string;
  /** Official text, including the title line. */
  fullText: string;
};

export function roadSignCopyFromQuestion(question: { explanation?: string | null }): RoadSignCopy {
  const fullText = (question.explanation ?? "").replace(/\r\n/g, "\n").trim();
  const parts = fullText.split("\n");
  const title = (parts[0] ?? "").trim();
  const body = parts.slice(1).join("\n").replace(/^\n+/, "").trim();
  return { title, body, fullText };
}

export function signHasDescription(copy: RoadSignCopy): boolean {
  return copy.body.length > 0;
}

/** Visible catalog slots. Hidden groups and anything else fall back to the first category. */
export function normalizeSignSlot(raw: string | null | undefined): string {
  const n = Number.parseInt((raw ?? "").trim(), 10);
  const slot = String(n);
  if (!Number.isInteger(n) || !isVisibleSignSlot(slot)) return "1";
  return slot;
}
