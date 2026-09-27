import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "src/components/ui/tooltip";
import { cn } from "src/lib/utils";
import { quizBareIconButton, quizBareIconButtonActive } from "src/components/exam/quizToolbarStyles";

type Props = {
	label: string;
	children: ReactNode;
	onClick?: () => void;
	disabled?: boolean;
	active?: boolean;
	className?: string;
	type?: "button" | "submit";
};

export default function ExamQuizToolbarIconButton({
	label,
	children,
	onClick,
	disabled,
	active,
	className,
	type = "button",
}: Props) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type={type}
					onClick={onClick}
					disabled={disabled}
					aria-label={label}
					aria-pressed={active}
					className={cn(quizBareIconButton, active && quizBareIconButtonActive, className)}
				>
					{children}
				</button>
			</TooltipTrigger>
			<TooltipContent side="bottom">{label}</TooltipContent>
		</Tooltip>
	);
}
