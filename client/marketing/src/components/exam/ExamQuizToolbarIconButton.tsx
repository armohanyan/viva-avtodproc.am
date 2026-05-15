import type { ReactNode } from "react";
import { Button } from "src/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "src/components/ui/tooltip";
import { cn } from "src/lib/utils";
import { quizToolbarTouchTarget } from "src/components/exam/quizToolbarStyles";

type Props = {
	label: string;
	children: ReactNode;
	onClick?: () => void;
	disabled?: boolean;
	active?: boolean;
	variant?: "ghost" | "outline";
	className?: string;
	type?: "button" | "submit";
};

export default function ExamQuizToolbarIconButton({
	label,
	children,
	onClick,
	disabled,
	active,
	variant = "outline",
	className,
	type = "button",
}: Props) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					type={type}
					variant={active ? "default" : variant}
					size="icon"
					onClick={onClick}
					disabled={disabled}
					aria-label={label}
					className={cn(
						quizToolbarTouchTarget,
						"transition-all",
						active && "shadow-sm ring-2 ring-primary/25",
						!active && variant === "ghost" && "text-muted-foreground hover:text-foreground",
						className,
					)}
				>
					{children}
				</Button>
			</TooltipTrigger>
			<TooltipContent side="bottom">{label}</TooltipContent>
		</Tooltip>
	);
}
