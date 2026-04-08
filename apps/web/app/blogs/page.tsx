import type { Metadata } from "next";
import Blogs from "src/pages/public/Blogs";

export const metadata: Metadata = {
  title: "Blog",
  description: "Driving tips, theory exam preparation, and updates from Viva Autoschool.",
};

export default function Page() {
  return <Blogs />;
}
