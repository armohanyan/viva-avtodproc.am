import type { TranslationKey } from "src/lib/i18n";

export interface InstructorNavigationLink {
  readonly href: string;
  readonly translationKey: TranslationKey;
}
