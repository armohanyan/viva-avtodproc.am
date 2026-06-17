import type { Metadata } from "next";
import ExamQuiz from "src/views/public/ExamQuiz";
import { getRequestSeoLang } from "@/lib/seo";

type Props = { params: Promise<{ mode: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { mode } = await params;
  const lang = await getRequestSeoLang();
  const titlePrefix =
    lang === "am" ? "Նշաններ" : lang === "ru" ? "Знаки" : "Signs";
  const description =
    lang === "am"
      ? "Ճանապարհային նշանների թեստ՝ պատասխանեք հարցերին և դիտեք արդյունքները։"
      : lang === "ru"
        ? "Тест по дорожным знакам: отвечайте на вопросы и просматривайте результаты."
        : "Road signs quiz — answer questions and review results.";
  return {
    title: `${titlePrefix} — ${mode}`,
    description,
    robots: { index: false, follow: true },
  };
}

export default async function Page({ params }: Props) {
  const { mode } = await params;
  return <ExamQuiz mode={mode} examListPath="/road-signs" />;
}
