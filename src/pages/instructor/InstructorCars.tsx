import InstructorPanelLayout from "src/components/InstructorPanelLayout";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import DataTableToolbar from "src/components/DataTableToolbar";
import PanelPageHeader from "src/components/PanelPageHeader";
import { CarFront } from "lucide-react";
import { useMemo, useState } from "react";
import { useFleetCars } from "src/modules/cars";
import { INSTRUCTOR_PANEL_EMAIL } from "src/modules/instructor/instructor.consts";

export default function InstructorCars() {
  const { t } = useLang();
  const { cars } = useFleetCars();
  const [search, setSearch] = useState("");

  const myCars = useMemo(() => {
    const email = INSTRUCTOR_PANEL_EMAIL.toLowerCase();
    return cars.filter((c) =>
      (c.assignedInstructorEmails ?? []).some((e) => e.toLowerCase() === email)
    );
  }, [cars]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return myCars.filter((c) => {
      const hay = [c.plate, c.make, c.model, c.year != null ? String(c.year) : "", c.notes ?? ""]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return !q || hay.includes(q);
    });
  }, [myCars, search]);

  const transLabel = (tr: "manual" | "automatic" | undefined) => {
    if (tr === "manual") return t("transmissionManual");
    if (tr === "automatic") return t("transmissionAutomatic");
    return "—";
  };

  const displayModel = (c: (typeof cars)[number]) => [c.make, c.model].filter(Boolean).join(" ").trim() || "—";

  return (
    <InstructorPanelLayout>
      <PanelPageHeader icon={CarFront} title={t("instructorCarsTitle")} subtitle={t("instructorCarsSubtitle")} />

      <Card className="border-border overflow-hidden">
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                {[t("carColModel"), t("carColPlate"), t("carColTransmission")].map((h, i) => (
                  <th
                    key={i}
                    className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{displayModel(c)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.plate}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{transLabel(c.transmission)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground text-center">{t("instructorCarsEmpty")}</p>
        )}
      </Card>
    </InstructorPanelLayout>
  );
}
