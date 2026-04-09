import type { Metadata } from "next";
import ExamTests from "src/pages/public/ExamTests";

export const metadata: Metadata = {
  title: "Exam Tests & Topic Practice",
  description:
    "Practice thematic driving theory questions, track progress, and prepare for the official exam with Viva Autoschool.",
};

export default function Page() {
  return <ExamTests />;
}
