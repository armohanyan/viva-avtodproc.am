import type { Metadata } from "next";
import Services from "src/pages/public/Services";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Practical driving lessons, theory courses, license preparation, and refresher training — everything you need for your Armenian driver's license.",
};

export default function Page() {
  return <Services />;
}
