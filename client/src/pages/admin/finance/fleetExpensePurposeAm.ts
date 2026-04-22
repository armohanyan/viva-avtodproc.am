/** Armenian preset labels for fleet expense purpose (finance outcomes). Last entry is always «Այլ». */
export const FLEET_EXPENSE_PURPOSE_OTHER_AM = "Այլ";

export const FLEET_EXPENSE_PURPOSE_PRESETS_AM = [
  "Ապահովագրություն",
  "Տեխնիկական զննում",
  "Նորոգում",
  "Վառելիք",
  "Անիվներ",
  "Մաքրում",
  "Կայանատեղի",
  "Տուգանք",
  "Տուրքեր և պետական տուրքեր",
  "Պահեստամասեր",
] as const;

export const FLEET_EXPENSE_PURPOSE_DROPDOWN_AM: readonly string[] = [
  ...FLEET_EXPENSE_PURPOSE_PRESETS_AM,
  FLEET_EXPENSE_PURPOSE_OTHER_AM,
];

const presetSet = new Set<string>(FLEET_EXPENSE_PURPOSE_PRESETS_AM);

export function purposeFromPurposeForm(choice: string, custom: string): string {
  if (choice === FLEET_EXPENSE_PURPOSE_OTHER_AM) return custom.trim();
  return choice.trim();
}

export function purposeFormFromStored(purpose: string): { choice: string; custom: string } {
  if (presetSet.has(purpose)) return { choice: purpose, custom: "" };
  return { choice: FLEET_EXPENSE_PURPOSE_OTHER_AM, custom: purpose };
}
