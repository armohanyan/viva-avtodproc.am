import { Scroll, SquareStack } from "lucide-react";
import { useLang } from "src/lib/i18n";
import { cn } from "src/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "src/components/ui/tooltip";
import { quizBareIconButton, quizBareIconButtonActive } from "src/components/exam/quizToolbarStyles";

export type QuizLayoutMode = "step" | "scroll";

type Props = {
	mode: QuizLayoutMode;
	onChange: (mode: QuizLayoutMode) => void;
};

export default function ExamQuizLayoutToggle({ mode, onChange }: Props) {
	const { t } = useLang();

	const options: { id: QuizLayoutMode; icon: typeof SquareStack; labelKey: "examQuizLayoutOneByOne" | "examQuizLayoutScroll" }[] = [
		{ id: "step", icon: SquareStack, labelKey: "examQuizLayoutOneByOne" },
		{ id: "scroll", icon: Scroll, labelKey: "examQuizLayoutScroll" },
	];

	return (
			<div
				role="group"
				aria-label={t("examQuizLayoutModeLabel")}
				className="inline-flex items-center gap-2"
			>
				{options.map(({ id, icon: Icon, labelKey }) => {
					const active = mode === id;
					const label = t(labelKey);
					return (
						<Tooltip key={id}>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={() => onChange(id)}
									aria-label={label}
									aria-pressed={active}
									className={cn(quizBareIconButton, active && quizBareIconButtonActive)}
								>
									<Icon className="size-4 shrink-0" aria-hidden />
								</button>
							</TooltipTrigger>
							<TooltipContent side="bottom">{label}</TooltipContent>
						</Tooltip>
					);
				})}
			</div>
	);
}
