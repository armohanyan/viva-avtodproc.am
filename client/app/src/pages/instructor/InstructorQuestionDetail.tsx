import { Redirect, useRoute } from "wouter";
import InstructorPanelLayout from "src/components/InstructorPanelLayout";
import QuestionDetailView from "src/components/exam/QuestionDetailView";
import { readQuestionReturnTo } from "src/lib/questionSessionReturn";
import { InstructorScopeGuard } from "src/modules/instructor/InstructorScopeGuard";

export default function InstructorQuestionDetail() {
	const [match, params] = useRoute("/instructor/questions/theme-exams/question/:id");
	const questionId = (params?.id ?? "").trim();

	if (!match || !questionId) {
		return <Redirect to="/instructor/questions/theme-exams" />;
	}

	const backHref = readQuestionReturnTo("/instructor/questions/theme-exams");

	return (
		<InstructorPanelLayout>
			<InstructorScopeGuard require="theory">
				<QuestionDetailView questionId={questionId} backHref={backHref} />
			</InstructorScopeGuard>
		</InstructorPanelLayout>
	);
}
