import type { Metadata } from "next";
import Packages from "src/pages/public/Packages";

export const metadata: Metadata = {
  title: "Packages & Pricing",
  description:
    "Compare driving lesson packages at Viva Autoschool — flexible options for practical training and theory included.",
};

export default function Page() {
  return <Packages />;
}
