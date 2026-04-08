import type { Metadata } from "next";
import ExamQuiz from "src/pages/public/ExamQuiz";

type Props = { params: Promise<{ mode: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { mode } = await params;
  return {
    title: `Quiz — ${mode}`,
    description: "Practice exam quiz — answer questions and review results.",
    robots: { index: false, follow: true },
  };
}

export default async function Page({ params }: Props) {
  const { mode } = await params;
  return <ExamQuiz mode={mode} examListPath="/thematic-questions" />;
}
