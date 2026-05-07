import type { TranslationKey } from "src/lib/i18n";

export interface AuthRouteMeta {
  readonly path: string;
  readonly translationKey: TranslationKey;
}
