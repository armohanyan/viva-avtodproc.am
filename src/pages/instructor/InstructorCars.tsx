import InstructorPanelLayout from "src/components/InstructorPanelLayout";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "src/components/ui/dialog";
import DataTableToolbar from "src/components/DataTableToolbar";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

type CarRow = { id: string; model: string; plate: string; transmission: "Manual" | "Automatic" };

const initialCars: CarRow[] = [
  { id: "CAR-1", model: "Toyota Corolla", plate: "00 AA 000", transmission: "Manual" },
  { id: "CAR-2", model: "Kia Rio", plate: "77 BB 111", transmission: "Automatic" },
];

export default function InstructorCars() {
  const { t } = useLang();
  const { showToast } = useToast();
  const [cars, setCars] = useState(initialCars);
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<CarRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<CarRow>>({ model: "", plate: "", transmission: "Manual" });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cars.filter((c) => [c.id, c.model, c.plate, c.transmission].join(" ").toLowerCase().includes(q) || !q);
  }, [cars, search]);

  const transLabel = (tr: CarRow["transmission"]) =>
    tr === "Manual" ? t("transmissionManual") : t("transmissionAutomatic");

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    setCars((list) => list.map((c) => (c.id === edit.id ? edit : c)));
    setEdit(null);
    showToast(t("profileSaved"), "success");
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.model?.trim() || !draft.plate?.trim()) {
      showToast(t("fillRequired"), "error");
      return;
    }
    const id = `CAR-${cars.length + 1}`;
    setCars((list) => [
      ...list,
      {
        id,
        model: draft.model!.trim(),
        plate: draft.plate!.trim(),
        transmission: draft.transmission === "Automatic" ? "Automatic" : "Manual",
      },
    ]);
    setAddOpen(false);
    setDraft({ model: "", plate: "", transmission: "Manual" });
    showToast(t("profileSaved"), "success");
  };

  const handleDelete = (id: string) => {
    setCars((list) => list.filter((c) => c.id !== id));
    showToast(t("userDeleted"), "success");
  };

  return (
    <InstructorPanelLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t("instructorCarsTitle")}</h2>
          <p className="text-muted-foreground text-sm mt-1">{t("instructorCarsSubtitle")}</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
          <Plus className="w-4 h-4" />
          {t("addCar")}
        </Button>
      </div>

      <Card className="border-border overflow-hidden">
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                {[t("carColModel"), t("carColPlate"), t("carColTransmission"), t("actions")].map((h, i) => (
                  <th key={i} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{c.model}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.plate}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{transLabel(c.transmission)}</Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button type="button" className="p-1.5 hover:bg-accent rounded-md mr-1" onClick={() => setEdit(c)}>
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button type="button" className="p-1.5 hover:bg-accent rounded-md text-destructive" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="p-6 text-sm text-muted-foreground text-center">{t("tableNoMatches")}</p>}
      </Card>

      <Dialog open={!!edit} onOpenChange={() => setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("edit")}</DialogTitle>
          </DialogHeader>
          {edit && (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">{t("carColModel")}</label>
                <Input value={edit.model} onChange={(e) => setEdit({ ...edit, model: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">{t("carColPlate")}</label>
                <Input value={edit.plate} onChange={(e) => setEdit({ ...edit, plate: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">{t("carColTransmission")}</label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={edit.transmission}
                  onChange={(e) =>
                    setEdit({ ...edit, transmission: e.target.value === "Automatic" ? "Automatic" : "Manual" })
                  }
                >
                  <option value="Manual">{t("transmissionManual")}</option>
                  <option value="Automatic">{t("transmissionAutomatic")}</option>
                </select>
              </div>
              <Button type="submit" className="w-full bg-primary text-primary-foreground">
                {t("saveChanges")}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addCar")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">{t("carColModel")}</label>
              <Input value={draft.model} onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">{t("carColPlate")}</label>
              <Input value={draft.plate} onChange={(e) => setDraft((d) => ({ ...d, plate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">{t("carColTransmission")}</label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={draft.transmission}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, transmission: e.target.value === "Automatic" ? "Automatic" : "Manual" }))
                }
              >
                <option value="Manual">{t("transmissionManual")}</option>
                <option value="Automatic">{t("transmissionAutomatic")}</option>
              </select>
            </div>
            <Button type="submit" className="w-full bg-primary text-primary-foreground">
              {t("addNew")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </InstructorPanelLayout>
  );
}
