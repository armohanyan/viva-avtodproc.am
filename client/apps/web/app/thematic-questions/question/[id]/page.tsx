import type { Metadata } from "next";
import QuestionDetail from "src/pages/public/QuestionDetail";
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

export default function Page() {
	return <QuestionDetail />;
}
