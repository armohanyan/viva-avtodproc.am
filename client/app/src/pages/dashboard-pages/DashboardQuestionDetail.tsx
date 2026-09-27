import { Redirect, useRoute } from "wouter";
import DashboardLayout from "src/components/DashboardLayout";
import QuestionDetailView from "src/components/exam/QuestionDetailView";
import { readQuestionReturnTo } from "src/lib/questionSessionReturn";

export default function DashboardQuestionDetail() {
  const [examMatch, examParams] = useRoute("/dashboard/learn/exam-tests/question/:id");
  const [themeMatch, themeParams] = useRoute("/dashboard/learn/thematic-tests/question/:id");
  const [roadSignsMatch, roadSignsParams] = useRoute("/dashboard/learn/road-signs/question/:id");
  const [legacyMatch, legacyParams] = useRoute("/dashboard/exam-tests/question/:id");
  const match = examMatch || themeMatch || roadSignsMatch || legacyMatch;
  const params = roadSignsMatch ? roadSignsParams : examMatch ? examParams : themeMatch ? themeParams : legacyParams;
  const questionId = (params?.id ?? "").trim();

  if (!match || !questionId) {
    return <Redirect to="/dashboard/learn/exam-tests" />;
  }

  const fallbackHref = roadSignsMatch
    ? "/dashboard/learn/road-signs"
    : themeMatch
      ? "/dashboard/learn/thematic-tests"
      : examMatch
        ? "/dashboard/learn/exam-tests"
        : "/dashboard/exam-tests";
  const backHref = readQuestionReturnTo(fallbackHref);

  return (
    <DashboardLayout>
      <QuestionDetailView questionId={questionId} backHref={backHref} />
    </DashboardLayout>
  );
}
