import type { Metadata } from "next";
import ExamTests from "src/pages/public/ExamTests";

export const metadata: Metadata = {
  title: "Exam Tests",
  description: "Thematic questions and exam-style practice for your driving theory test.",
};

export default function Page() {
  return <ExamTests />;
}
