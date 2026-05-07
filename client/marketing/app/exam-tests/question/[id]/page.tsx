import type { Metadata } from "next";
import QuestionDetail from "src/views/public/QuestionDetail";
import { getRequestSeoLang } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
	const lang = await getRequestSeoLang();
	const title =
		lang === "am" ? "Հարց" : lang === "ru" ? "Вопрос" : "Question";
	return {
		title,
		robots: { index: true, follow: true },
	};
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	return <QuestionDetail questionId={id} backHref="/exam-tests" />;
}
