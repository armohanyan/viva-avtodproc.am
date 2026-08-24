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
        <div className="mb-4">
          <Link href="/instructor/questions">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              {t("instructorQuestionsBack")}
            </Button>
          </Link>
        </div>
        <ThemeExamsPage
          quizHrefForPack={(packIndex) => `/instructor/questions/theme-exams/quiz/full?themeExam=${packIndex}`}
        />
      </InstructorScopeGuard>
    </InstructorPanelLayout>
  );
}
