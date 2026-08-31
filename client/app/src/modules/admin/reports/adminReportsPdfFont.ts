import type jsPDF from "jspdf";

const FONT_URL =
  "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSansArmenian/NotoSansArmenian-Regular.ttf";
const FONT_BOLD_URL =
  "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSansArmenian/NotoSansArmenian-Bold.ttf";
const FONT_REGULAR_FILE = "NotoSansArmenian-Regular.ttf";
const FONT_BOLD_FILE = "NotoSansArmenian-Bold.ttf";

export const ARMENIAN_PDF_FONT = "NotoSansArmenian";

let fontDataPromise: Promise<{ regular: string; bold: string }> | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function loadFontData(): Promise<{ regular: string; bold: string }> {
  const [regularRes, boldRes] = await Promise.all([fetch(FONT_URL), fetch(FONT_BOLD_URL)]);
  if (!regularRes.ok || !boldRes.ok) {
    throw new Error("Failed to load Armenian PDF fonts");
  }
  const [regularBuf, boldBuf] = await Promise.all([regularRes.arrayBuffer(), boldRes.arrayBuffer()]);
  return {
    regular: arrayBufferToBase64(regularBuf),
    bold: arrayBufferToBase64(boldBuf),
  };
}

export async function applyArmenianPdfFont(doc: jsPDF): Promise<void> {
  if (!fontDataPromise) {
    fontDataPromise = loadFontData();
  }
  const { regular, bold } = await fontDataPromise;
  doc.addFileToVFS(FONT_REGULAR_FILE, regular);
  doc.addFileToVFS(FONT_BOLD_FILE, bold);
  doc.addFont(FONT_REGULAR_FILE, ARMENIAN_PDF_FONT, "normal");
  doc.addFont(FONT_BOLD_FILE, ARMENIAN_PDF_FONT, "bold");
}
