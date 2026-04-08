import type { Metadata } from "next";
import Instructors from "src/pages/public/Instructors";

export const metadata: Metadata = {
  title: "Instructors",
  description: "Meet our certified driving instructors — patient, professional, and focused on safe, confident drivers.",
};

export default function Page() {
  return <Instructors />;
}
