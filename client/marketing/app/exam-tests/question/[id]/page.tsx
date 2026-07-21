import type { Metadata } from "next";
import QuestionDetail from "src/views/public/QuestionDetail";

/** Thin per-question pages — keep shareable but out of the index. */
export const metadata: Metadata = {
  title: "Question",
  robots: { index: false, follow: true },
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuestionDetail questionId={id} backHref="/exam-tests" />;
}
