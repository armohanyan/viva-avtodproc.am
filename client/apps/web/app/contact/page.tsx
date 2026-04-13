import type { Metadata } from "next";
import Contact from "src/pages/public/Contact";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Viva Autoschool in Yerevan — phone, email, branches, and lesson booking information.",
};

export default function Page() {
  return <Contact />;
}
