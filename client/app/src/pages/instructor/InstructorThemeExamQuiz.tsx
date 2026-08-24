import InstructorPanelLayout from "src/components/InstructorPanelLayout";
import { InstructorScopeGuard } from "src/modules/instructor/InstructorScopeGuard";
import { DashboardExamQuizView } from "src/pages/dashboard-pages/DashboardExamQuiz";

export default function InstructorThemeExamQuiz() {
  return (
    <InstructorPanelLayout>
      <InstructorScopeGuard require="theory">
        <DashboardExamQuizView />
      </InstructorScopeGuard>
    </InstructorPanelLayout>
  );
}
