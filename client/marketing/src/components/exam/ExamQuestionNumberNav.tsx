import { useEffect, useRef } from "react";
import { useLang } from "src/lib/i18n";
import { cn } from "src/lib/utils";

export type QuestionNavItemStatus = "unanswered" | "answered" | "correct" | "wrong";

export type ExamQuestionNumberNavProps = {
	total: number;
	currentIndex: number;
	statuses: QuestionNavItemStatus[];
	onSelect: (index: number) => void;
	/** Keep the number strip fixed while the question list scrolls (scroll layout). */
	pinned?: boolean;
	className?: string;
};

function statusLabel(
	status: QuestionNavItemStatus,
	n: number,
	isCurrent: boolean,
	t: (key: "examQuizQuestionNavGo" | "examQuizQuestionNavCorrect" | "examQuizQuestionNavWrong" | "examQuizQuestionNavAnswered" | "examQuizQuestionNavUnanswered") => string,
): string {
	const base = t("examQuizQuestionNavGo").replace("{n}", String(n));
	if (isCurrent) return base;
	if (status === "correct") return `${base} — ${t("examQuizQuestionNavCorrect")}`;
	if (status === "wrong") return `${base} — ${t("examQuizQuestionNavWrong")}`;
	if (status === "answered") return `${base} — ${t("examQuizQuestionNavAnswered")}`;
	return `${base} — ${t("examQuizQuestionNavUnanswered")}`;
}

/** Scroll only the nav scroller — never the page (avoids breaking sticky). */
function scrollChildIntoContainer(scroller: HTMLElement, child: HTMLElement) {
	const scrollerRect = scroller.getBoundingClientRect();
	const childRect = child.getBoundingClientRect();
	const isColumn = getComputedStyle(scroller).flexDirection === "column";

	if (isColumn) {
		const overflowTop = childRect.top < scrollerRect.top;
		const overflowBottom = childRect.bottom > scrollerRect.bottom;
		if (!overflowTop && !overflowBottom) return;
		scroller.scrollTop +=
			childRect.top - scrollerRect.top - (scrollerRect.height - childRect.height) / 2;
		return;
	}

	const overflowLeft = childRect.left < scrollerRect.left;
	const overflowRight = childRect.right > scrollerRect.right;
	if (!overflowLeft && !overflowRight) return;
	scroller.scrollLeft +=
		childRect.left - scrollerRect.left - (scrollerRect.width - childRect.width) / 2;
}

export default function ExamQuestionNumberNav({
	total,
	currentIndex,
	statuses,
	onSelect,
	pinned = false,
	className,
}: ExamQuestionNumberNavProps) {
	const { t } = useLang();
	const scrollerRef = useRef<HTMLDivElement>(null);
	const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

	useEffect(() => {
		const scroller = scrollerRef.current;
		const btn = itemRefs.current[currentIndex];
		if (!scroller || !btn) return;
		scrollChildIntoContainer(scroller, btn);
	}, [currentIndex]);

	if (total <= 0) return null;

	return (
		<nav
			aria-label={t("examQuizQuestionNavLabel")}
			className={cn(
				"z-20 h-fit min-w-0",
				pinned
					? // Scroll mode: always a sticky top strip so numbers stay fixed while questions move.
						"sticky top-0 mb-4 w-full -mx-1 rounded-xl border border-border bg-background/95 px-2 py-2 shadow-xs backdrop-blur supports-[backdrop-filter]:bg-background/80"
					: cn(
							"mb-4 w-full -mx-1 rounded-xl border border-border bg-background/95 px-2 py-2 shadow-xs backdrop-blur supports-[backdrop-filter]:bg-background/80",
							"lg:mx-0 lg:mb-0 lg:w-auto lg:shrink-0 lg:self-start lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none",
						),
				className,
			)}
		>
			<div
				ref={scrollerRef}
				className={cn(
					// Extra padding so circle borders + current ring aren't clipped by overflow.
					"flex gap-1.5 overflow-x-auto overscroll-x-contain px-1 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
					// Step mode: vertical rail on large screens. Scroll/pinned mode: keep horizontal so sticky top works reliably.
					!pinned &&
						"lg:max-h-[min(70vh,36rem)] lg:w-16 lg:flex-col lg:items-center lg:overflow-y-auto lg:px-2 lg:py-2",
				)}
			>
				{Array.from({ length: total }, (_, i) => {
					const status = statuses[i] ?? "unanswered";
					const isCurrent = i === currentIndex;
					return (
						<button
							key={i}
							ref={(el) => {
								itemRefs.current[i] = el;
							}}
							type="button"
							onClick={() => onSelect(i)}
							aria-label={statusLabel(status, i + 1, isCurrent, t)}
							aria-current={isCurrent ? "true" : undefined}
							className={cn(
								"inline-flex size-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums transition-colors",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
								"max-sm:size-10 max-sm:text-sm",
								isCurrent && "ring-2 ring-primary ring-offset-2 ring-offset-background",
								status === "correct" &&
									"border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-600/90",
								status === "wrong" && "border-red-600 bg-red-600 text-white hover:bg-red-600/90",
								status === "answered" &&
									"border-primary bg-primary/15 text-foreground hover:bg-primary/25",
								status === "unanswered" &&
									"border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
							)}
						>
							{i + 1}
						</button>
					);
				})}
			</div>
		</nav>
	);
}

/** Build nav statuses from answers + correct indices. */
export function buildQuestionNavStatuses(
	answers: (number | null | undefined)[],
	correctIndices: number[],
	options?: { hideCorrectness?: boolean },
): QuestionNavItemStatus[] {
	const hide = Boolean(options?.hideCorrectness);
	return correctIndices.map((correctIndex, i) => {
		const ans = answers[i];
		if (ans === null || ans === undefined) return "unanswered";
		if (hide) return "answered";
		return ans === correctIndex ? "correct" : "wrong";
	});
}
