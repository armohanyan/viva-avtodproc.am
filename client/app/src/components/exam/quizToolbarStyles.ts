import { cn } from "src/lib/utils";

/** Icon-only control: no padding, border, or fill. */
export const quizBareIconButton = cn(
	"inline-flex size-6 shrink-0 items-center justify-center rounded-md leading-none",
	"border-0 bg-transparent p-0 shadow-none ring-0",
	"text-muted-foreground hover:bg-transparent hover:text-foreground",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
	"disabled:pointer-events-none disabled:opacity-50",
	"[&_svg]:size-5",
);

export const quizBareIconButtonActive = "text-primary hover:bg-transparent hover:text-primary";

export const quizToolbarToolGroup = "inline-flex items-center gap-3";
