import InstructorPanelLayout from "src/components/InstructorPanelLayout";
import ThemeExamsPage from "src/components/exam/ThemeExamsPage";
import { Button } from "src/components/ui/button";
import { InstructorScopeGuard } from "src/modules/instructor/InstructorScopeGuard";
import { useLang } from "src/lib/i18n";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function InstructorThemeExams() {
  const { t } = useLang();
  return (
    <InstructorPanelLayout>
      <InstructorScopeGuard require="theory">
        <ThemeExamsPage
          quizHrefForPack={(packIndex) => `/instructor/questions/theme-exams/quiz/full?themeExam=${packIndex}`}
          headerLeading={
            <Link href="/instructor/questions" aria-label={t("instructorQuestionsBack")}>
              <Button variant="outline" size="icon" aria-label={t("instructorQuestionsBack")}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          }
        />
      </InstructorScopeGuard>
    </InstructorPanelLayout>
  );
}
