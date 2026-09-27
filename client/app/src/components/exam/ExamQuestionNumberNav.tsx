import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLang } from "src/lib/i18n";
import { cn } from "src/lib/utils";

export type QuestionNavItemStatus = "unanswered" | "answered" | "correct" | "wrong";

export type ExamQuestionNumberNavProps = {
	total: number;
	currentIndex: number;
	statuses: QuestionNavItemStatus[];
	onSelect: (index: number) => void;
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
	const overflowTop = childRect.top < scrollerRect.top;
	const overflowBottom = childRect.bottom > scrollerRect.bottom;
	if (!overflowTop && !overflowBottom) return;
	scroller.scrollTop += childRect.top - scrollerRect.top - (scrollerRect.height - childRect.height) / 2;
}

export default function ExamQuestionNumberNav({
	total,
	currentIndex,
	statuses,
	onSelect,
	className,
}: ExamQuestionNumberNavProps) {
	const { t } = useLang();
	const scrollerRef = useRef<HTMLDivElement>(null);
	const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
	const [canScrollUp, setCanScrollUp] = useState(false);
	const [canScrollDown, setCanScrollDown] = useState(false);

	useEffect(() => {
		const scroller = scrollerRef.current;
		const btn = itemRefs.current[currentIndex];
		if (!scroller || !btn) return;
		scrollChildIntoContainer(scroller, btn);
	}, [currentIndex, total]);

	useEffect(() => {
		const scroller = scrollerRef.current;
		if (!scroller) return;
		const update = () => {
			const up = scroller.scrollTop > 4;
			const down = scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 4;
			setCanScrollUp(up);
			setCanScrollDown(down);
		};
		update();
		scroller.addEventListener("scroll", update, { passive: true });
		const observer = new ResizeObserver(update);
		observer.observe(scroller);
		return () => {
			scroller.removeEventListener("scroll", update);
			observer.disconnect();
		};
	}, [total]);

	if (total <= 0) return null;

	return (
		<nav
			aria-label={t("examQuizQuestionNavLabel")}
			className={cn(
				"sticky top-3 z-20 flex h-[calc(100dvh-9.5rem)] w-9 shrink-0 flex-col self-start rounded-lg border border-border bg-background/95 py-0.5 shadow-xs",
				className,
			)}
		>
			<div className="relative min-h-0 flex-1">
				<div
					ref={scrollerRef}
					className="flex h-full flex-col items-center gap-0.5 overflow-y-auto overscroll-y-contain px-0.5 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
									"inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold tabular-nums transition-colors",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
									isCurrent && "ring-2 ring-primary",
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
				{canScrollUp ? (
					<div
						className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-background to-transparent"
						aria-hidden
					/>
				) : null}
				{canScrollDown ? (
					<div
						className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background to-transparent"
						aria-hidden
					/>
				) : null}
			</div>
			{canScrollDown ? (
				<button
					type="button"
					className="mx-auto inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
					aria-label={t("examQuizQuestionNavScrollMore")}
					onClick={() => {
						scrollerRef.current?.scrollBy({ top: 160, behavior: "smooth" });
					}}
				>
					<ChevronDown className="size-4" aria-hidden />
				</button>
			) : null}
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
