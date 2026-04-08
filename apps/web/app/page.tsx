import type { Metadata } from "next";
import Home from "src/pages/public/Home";

export const metadata: Metadata = {
  title: "Driving Lessons & Theory",
  description:
    "Learn to drive step-by-step with certified instructors. Practical lessons, theory courses, and exam preparation in Yerevan, Armenia.",
};

export default function Page() {
  return <Home />;
}
