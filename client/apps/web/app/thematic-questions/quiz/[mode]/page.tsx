import type { Metadata } from "next";
import ExamQuiz from "src/pages/public/ExamQuiz";
import { getRequestSeoLang } from "@/lib/seo";

type Props = { params: Promise<{ mode: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { mode } = await params;
  const lang = await getRequestSeoLang();
  const titlePrefix =
    lang === "am" ? "Թեստ" : lang === "ru" ? "Тест" : "Quiz";
  const description =
    lang === "am"
      ? "Պրակտիկ թեստ՝ պատասխանեք հարցերին և դիտեք արդյունքները։"
      : lang === "ru"
        ? "Практический тест: отвечайте на вопросы и просматривайте результаты."
        : "Practice exam quiz — answer questions and review results.";
  return {
    title: `${titlePrefix} — ${mode}`,
    description,
    robots: { index: false, follow: true },
  };
}

export default async function Page({ params }: Props) {
  const { mode } = await params;
  return <ExamQuiz mode={mode} examListPath="/thematic-questions" />;
}
