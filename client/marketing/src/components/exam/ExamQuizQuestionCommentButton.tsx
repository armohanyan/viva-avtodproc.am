import type { ComponentType, ReactNode } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "src/components/ui/button";
import { TooltipProvider } from "src/components/ui/tooltip";
import { useLang } from "src/lib/i18n";
import { cn } from "src/lib/utils";
import ExamQuizToolbarCommentsSlot from "src/components/exam/ExamQuizToolbarCommentsSlot";

type LinkLike = ComponentType<{ href: string; children: ReactNode }>;

type Props = {
	href: string;
	Link: LinkLike;
	disabled?: boolean;
	className?: string;
};

/** Opens question detail (comments) — placed on each question card in the quiz. */
export default function ExamQuizQuestionCommentButton({ href, Link, disabled, className }: Props) {
	const { t } = useLang();
	return (
		<TooltipProvider delayDuration={300}>
			<ExamQuizToolbarCommentsSlot>
				<Link href={href}>
					<Button
						variant="outline"
						size="icon"
						disabled={disabled}
						className={cn("size-9 min-h-9 min-w-9 shrink-0", className)}
						aria-label={t("questionDetailOpenAction")}
					>
						<MessageSquare className="size-4" aria-hidden />
					</Button>
				</Link>
			</ExamQuizToolbarCommentsSlot>
		</TooltipProvider>
	);
}
