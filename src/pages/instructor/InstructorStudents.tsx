import InstructorPanelLayout from "src/components/InstructorPanelLayout";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import DataTableToolbar from "src/components/DataTableToolbar";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Users } from "lucide-react";
import { useMemo, useState } from "react";

type Row = { id: string; name: string; email: string; phone: string; package: string; lessons: string; status: string };

const rows: Row[] = [
  { id: "ST-101", name: "Ani Karapetyan", email: "ani@example.com", phone: "+374 99 111 222", package: "Standard", lessons: "4/18", status: "active" },
  { id: "ST-102", name: "Suren Danielyan", email: "suren@example.com", phone: "+374 98 777 888", package: "Standard", lessons: "0/18", status: "inactive" },
  { id: "ST-103", name: "Mane Poghosyan", email: "mane@example.com", phone: "+374 91 999 000", package: "Basic", lessons: "6/10", status: "active" },
];

const statusColor: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-100 text-slate-500",
};

export default function InstructorStudents() {
  const { t } = useLang();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const hay = [r.id, r.name, r.email, r.phone, r.package, r.lessons, r.status].join(" ").toLowerCase();
      return !q || hay.includes(q);
    });
  }, [search]);

  return (
    <InstructorPanelLayout>
      <PanelPageHeader icon={Users} title={t("instructorMyStudents")} subtitle={t("instructorStudentsPageSubtitle")} />

      <Card className="border-border overflow-hidden">
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                {[t("name"), t("accountsColEmail"), t("phoneNumber"), t("packages"), t("purchasesProgress"), t("status")].map((h, i) => (
                  <th key={i} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.phone}</td>
                  <td className="px-4 py-3">{r.package}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.lessons}</td>
                  <td className="px-4 py-3">
                    <Badge className={statusColor[r.status] ?? ""}>{t(r.status as "active" | "inactive")}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="p-6 text-sm text-muted-foreground text-center">{t("tableNoMatches")}</p>}
      </Card>
    </InstructorPanelLayout>
  );
}
