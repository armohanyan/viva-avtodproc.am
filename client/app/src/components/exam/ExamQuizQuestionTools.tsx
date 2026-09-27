import type { ComponentType, ReactNode } from "react";
import ExamQuizQuestionCommentButton from "src/components/exam/ExamQuizQuestionCommentButton";
import ExamQuizQuestionSaveButton from "src/components/exam/ExamQuizQuestionSaveButton";
import { rememberQuizQuestionIndex } from "src/lib/questionSessionReturn";
import { cn } from "src/lib/utils";

type LinkLike = ComponentType<{ href: string; children: ReactNode }>;

type Props = {
	questionId: string;
	href: string;
	Link: LinkLike;
	questionIndex?: number;
	className?: string;
};

/** Save + comments, kept together on each question card. */
export default function ExamQuizQuestionTools({ questionId, href, Link, questionIndex, className }: Props) {
	return (
		<div className={cn("flex shrink-0 items-center gap-2", className)}>
			<ExamQuizQuestionSaveButton questionId={questionId} />
			<ExamQuizQuestionCommentButton
				href={href}
				Link={Link}
				onClick={questionIndex == null ? undefined : () => rememberQuizQuestionIndex(questionIndex)}
			/>
		</div>
	);
}
