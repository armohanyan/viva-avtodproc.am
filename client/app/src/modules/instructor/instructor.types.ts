import type { TranslationKey } from "src/lib/i18n";

/** Which instructor teaching type can see this nav item. */
export type InstructorNavScope = "shared" | "practical" | "theory";

export interface InstructorNavigationLink {
	readonly href: string;
	readonly translationKey: TranslationKey;
	readonly scope: InstructorNavScope;
}
