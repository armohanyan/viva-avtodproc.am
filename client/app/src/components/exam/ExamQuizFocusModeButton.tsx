import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "src/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "src/components/ui/tooltip";
import { useLang } from "src/lib/i18n";
import { cn } from "src/lib/utils";
import { quizToolbarTouchTarget } from "src/components/exam/quizToolbarStyles";

type Props = {
	active: boolean;
	onToggle: () => void;
	className?: string;
};

export default function ExamQuizFocusModeButton({ active, onToggle, className }: Props) {
	const { t } = useLang();
	const tooltip = active ? t("examQuizExitFocusMode") : t("examQuizFocusMode");
	const label = active ? t("examQuizExitFocus") : t("examQuizFocusMode");

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					type="button"
					variant={active ? "default" : "outline"}
					onClick={onToggle}
					aria-pressed={active}
					aria-label={tooltip}
					className={cn(
						quizToolbarTouchTarget,
						"h-10 min-h-10 w-auto max-sm:min-h-11 gap-2 px-3 sm:px-4 font-medium shadow-xs transition-all",
						"focus-visible:ring-[3px] focus-visible:ring-ring/50",
						active
							? "bg-primary text-primary-foreground hover:bg-primary/90 ring-2 ring-primary/30"
							: "border-primary/45 bg-primary/8 text-primary hover:border-primary hover:bg-primary/12 dark:bg-primary/15",
						className,
					)}
				>
					{active ? (
						<Minimize2 className="size-4 shrink-0" aria-hidden />
					) : (
						<Maximize2 className="size-4 shrink-0" aria-hidden />
					)}
					<span className="hidden sm:inline">{label}</span>
				</Button>
			</TooltipTrigger>
			<TooltipContent side="bottom" className="sm:hidden">
				{tooltip}
			</TooltipContent>
		</Tooltip>
	);
}
