import type { Metadata } from "next";
import ExamQuiz from "src/views/public/ExamQuiz";

type Props = { params: Promise<{ mode: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { mode } = await params;
  return {
    title: `Թեստ - ${mode}`,
    description: "Պրակտիկ թեստ՝ պատասխանեք հարցերին և դիտեք արդյունքները։",
    robots: { index: false, follow: true },
  };
}

export default async function Page({ params }: Props) {
  const { mode } = await params;
  return <ExamQuiz mode={mode} examListPath="/exam-tests" />;
}
