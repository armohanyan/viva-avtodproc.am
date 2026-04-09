import type { Metadata } from "next";
import About from "src/pages/public/About";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Viva Driving School — Armenia's trusted driving education center since 2010. Certified instructors, modern vehicles, and student-centered training.",
};

export default function Page() {
  return <About />;
}
