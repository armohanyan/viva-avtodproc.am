import AdminLayout from "src/components/AdminLayout";
import type { ReactNode } from "react";

/** Director pages use the same shell as the rest of the admin panel. */
export default function DirectorLayout({ children }: { children: ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
