import { cn } from "src/lib/utils";

/** 40px desktop, 44px mobile — quiz toolbar touch targets. */
export const quizToolbarTouchTarget = cn(
	"size-10 min-h-10 min-w-10 shrink-0",
	"max-sm:min-h-11 max-sm:min-w-11 max-sm:size-11",
);

export const quizToolbarToolGroup = cn(
	"inline-flex items-center gap-1 rounded-xl bg-muted/40 p-1 shadow-xs",
);
