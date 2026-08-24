import DashboardLayout from "src/components/DashboardLayout";
import DashboardLearnSubnav from "src/components/dashboard/DashboardLearnSubnav";
import ThemeExamsPage from "src/components/exam/ThemeExamsPage";

export default function DashboardThemeExams() {
  return (
    <DashboardLayout>
      <ThemeExamsPage
        subnav={<DashboardLearnSubnav active="theme-exams" />}
        quizHrefForPack={(packIndex) => `/dashboard/learn/exam-tests/quiz/full?themeExam=${packIndex}`}
      />
    </DashboardLayout>
  );
}
