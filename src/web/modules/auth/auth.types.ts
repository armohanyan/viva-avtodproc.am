import type { TranslationKey } from "@/lib/i18n";

export interface AuthRouteMeta {
  readonly path: string;
  readonly translationKey: TranslationKey;
}
