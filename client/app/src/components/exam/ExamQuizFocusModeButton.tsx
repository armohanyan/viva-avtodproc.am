import { Maximize2, Minimize2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "src/components/ui/tooltip";
import { useLang } from "src/lib/i18n";
import { cn } from "src/lib/utils";
import { quizBareIconButton, quizBareIconButtonActive } from "src/components/exam/quizToolbarStyles";

type Props = {
	active: boolean;
	onToggle: () => void;
	className?: string;
};

export default function ExamQuizFocusModeButton({ active, onToggle, className }: Props) {
	const { t } = useLang();
	const tooltip = active ? t("examQuizExitFocusMode") : t("examQuizFocusMode");

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					onClick={onToggle}
					aria-pressed={active}
					aria-label={tooltip}
					className={cn(quizBareIconButton, active && quizBareIconButtonActive, className)}
				>
					{active ? (
						<Minimize2 className="size-4 shrink-0" aria-hidden />
					) : (
						<Maximize2 className="size-4 shrink-0" aria-hidden />
					)}
				</button>
			</TooltipTrigger>
			<TooltipContent side="bottom">{tooltip}</TooltipContent>
		</Tooltip>
	);
}
