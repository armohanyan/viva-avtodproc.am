/** Topic ids used by thematic UI (icons / i18n keys) — counts come from the exam question pool. */
export const THEMATIC_TOPIC_IDS = ["5", "3", "2", "6", "8", "7", "10", "4", "9", "1"] as const;

/** `t(...)` keys in the same order as {@link THEMATIC_TOPIC_IDS}. */
export const THEMATIC_TOPIC_TITLE_KEYS = [
  "examTestsTopic1Title",
  "examTestsTopic2Title",
  "examTestsTopic3Title",
  "examTestsTopic4Title",
  "examTestsTopic5Title",
  "examTestsTopic6Title",
  "examTestsTopic7Title",
  "examTestsTopic8Title",
  "examTestsTopic9Title",
  "examTestsTopic10Title",
] as const;

export type ThematicTopicId = (typeof THEMATIC_TOPIC_IDS)[number];

export const THEMATIC_TOPIC_ICON: Record<string, string> = {
  "5": "/topic-icons/theme-1.svg",
  "3": "/topic-icons/theme-2.svg",
  "2": "/topic-icons/theme-3.svg",
  "6": "/topic-icons/theme-4.svg",
  "8": "/topic-icons/theme-5.svg",
  "7": "/topic-icons/theme-6.svg",
  "10": "/topic-icons/theme-7.svg",
  "4": "/topic-icons/theme-8.svg",
  "9": "/topic-icons/theme-9.svg",
  "1": "/topic-icons/theme-10.svg",
};
