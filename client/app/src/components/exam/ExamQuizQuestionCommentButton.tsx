import type { ComponentType, ReactNode } from "react";
import { MessageSquare } from "lucide-react";
import { TooltipProvider } from "src/components/ui/tooltip";
import { useLang } from "src/lib/i18n";
import { quizBareIconButton } from "src/components/exam/quizToolbarStyles";
import { cn } from "src/lib/utils";
import ExamQuizToolbarCommentsSlot from "src/components/exam/ExamQuizToolbarCommentsSlot";

type LinkLike = ComponentType<{
	href: string;
	children: ReactNode;
	onClick?: () => void;
	"aria-label"?: string;
	className?: string;
}>;

type Props = {
	href: string;
	Link: LinkLike;
	disabled?: boolean;
	className?: string;
	onClick?: () => void;
};

/** Opens question detail (comments) — placed on each question card in the quiz. */
export default function ExamQuizQuestionCommentButton({ href, Link, disabled, className, onClick }: Props) {
	const { t } = useLang();
	return (
		<TooltipProvider delayDuration={300}>
			<ExamQuizToolbarCommentsSlot>
				{disabled ? (
					<span
						className={cn(quizBareIconButton, "opacity-50", className)}
						aria-disabled="true"
						aria-label={t("questionDetailOpenAction")}
					>
						<MessageSquare className="size-5" aria-hidden />
					</span>
				) : (
					<Link
						href={href}
						onClick={onClick}
						aria-label={t("questionDetailOpenAction")}
						className={cn(quizBareIconButton, className)}
					>
						<MessageSquare className="size-5" aria-hidden />
					</Link>
				)}
			</ExamQuizToolbarCommentsSlot>
		</TooltipProvider>
	);
}
