import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import ExamQuizFocusModeButton from "src/components/exam/ExamQuizFocusModeButton";
import ExamQuizLayoutToggle, { type QuizLayoutMode } from "src/components/exam/ExamQuizLayoutToggle";
import ExamQuizToolbarIconButton from "src/components/exam/ExamQuizToolbarIconButton";
import { quizToolbarToolGroup } from "src/components/exam/quizToolbarStyles";
import { TooltipProvider } from "src/components/ui/tooltip";
import { useLang } from "src/lib/i18n";
import { cn } from "src/lib/utils";

export type ExamQuizToolbarProps = {
	progress: ReactNode;
	countdown?: ReactNode;
	onBack: () => void;
	focusMode: boolean;
	onFocusToggle: () => void;
	layoutMode: QuizLayoutMode;
	onLayoutModeChange: (mode: QuizLayoutMode) => void;
	className?: string;
};

export default function ExamQuizToolbar({
	progress,
	countdown,
	onBack,
	focusMode,
	onFocusToggle,
	layoutMode,
	onLayoutModeChange,
	className,
}: ExamQuizToolbarProps) {
	const { t } = useLang();

	return (
		<TooltipProvider delayDuration={300}>
			<div
				className={cn(
					"sticky top-0 z-30 mb-6 flex items-center justify-between gap-2 bg-background py-2",
					className,
				)}
			>
				<div className="flex min-w-0 items-center gap-2">
					<ExamQuizToolbarIconButton label={t("examQuizBackToList")} onClick={onBack}>
						<ArrowLeft className="size-4" aria-hidden />
					</ExamQuizToolbarIconButton>
					<div className="min-w-0 truncate text-sm text-muted-foreground">{progress}</div>
				</div>

				<div className="flex shrink-0 items-center gap-2">
					{countdown ? <div className="shrink-0">{countdown}</div> : null}
					<div className={cn(quizToolbarToolGroup, "gap-2")}>
						<ExamQuizLayoutToggle mode={layoutMode} onChange={onLayoutModeChange} />
					</div>
					<ExamQuizFocusModeButton active={focusMode} onToggle={onFocusToggle} />
				</div>
			</div>
		</TooltipProvider>
	);
}
