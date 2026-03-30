import AdminLayout from "src/components/AdminLayout";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "src/components/ui/dialog";
import ConfirmDialog from "src/components/ConfirmDialog";
import { Plus, Edit2, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { CountUpText, Reveal } from "src/lib/motion";

type Pkg = { id: string; name: string; price: string; lessons: number; enrolled: number; status: string; features: string[]; };

const initialPackages: Pkg[] = [
  { id: "PKG-001", name: "Basic", price: "35,000", lessons: 10, enrolled: 128, status: "active", features: ["Practical lessons", "Theory access", "Certificate"] },
  { id: "PKG-002", name: "Standard", price: "55,000", lessons: 18, enrolled: 342, status: "active", features: ["Practical lessons", "Theory access", "Practice exam", "Certificate"] },
  { id: "PKG-003", name: "Premium", price: "85,000", lessons: 28, enrolled: 87, status: "active", features: ["All in Standard", "Priority booking", "Unlimited practice exams"] },
  { id: "PKG-004", name: "Refresher", price: "18,000", lessons: 5, enrolled: 45, status: "active", features: ["Skills assessment", "Targeted lessons"] },
];

export default function AdminPackages() {
  const { t } = useLang();
  const { showToast } = useToast();
  const [packages, setPackages] = useState(initialPackages);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editPkg, setEditPkg] = useState<Pkg | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newPkg, setNewPkg] = useState({ name: "", price: "", lessons: 10 });

  const handleDelete = () => {
    setPackages(p => p.filter(x => x.id !== deleteId));
    showToast(t("packageDeleted"), "success");
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPkg) return;
    setPackages(p => p.map(x => x.id === editPkg.id ? editPkg : x));
    setEditPkg(null);
    showToast(t("packageUpdatedToast"), "success");
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPkg.name || !newPkg.price) { showToast(t("fillRequired"), "error"); return; }
    const pkg: Pkg = { id: `PKG-${String(packages.length + 1).padStart(3, "0")}`, ...newPkg, enrolled: 0, status: "active", features: [] };
    setPackages(p => [...p, pkg]);
    setAddOpen(false);
    setNewPkg({ name: "", price: "", lessons: 10 });
    showToast(t("packageCreatedToast"), "success");
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">{t("packages")}</h2>
        <Button onClick={() => setAddOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="w-4 h-4" />{t("addNew")}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {packages.map((pkg, i) => (
          <Reveal key={i} delay={i * 0.06}>
            <Card className="p-6 border-slate-100">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg text-slate-900">{pkg.name}</h3>
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">{t("active")}</Badge>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    <CountUpText value={pkg.price} /> ֏
                  </p>
                  <p className="text-sm text-slate-500">
                    <CountUpText value={pkg.lessons} /> {t("lessons")}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Users className="w-4 h-4" />
                  <CountUpText value={pkg.enrolled} className="font-semibold text-slate-700" /> <span>enrolled</span>
                </div>
              </div>
            <ul className="space-y-1.5 mb-5">
              {pkg.features.map((f, j) => (
                <li key={j} className="text-xs text-slate-500 flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-blue-400 shrink-0" />{f}
                </li>
              ))}
            </ul>
            <div className="flex gap-2 pt-4 border-t border-slate-100">
              <Button size="sm" variant="outline" onClick={() => setEditPkg({ ...pkg })} className="flex-1 border-slate-200 gap-1.5">
                <Edit2 className="w-3.5 h-3.5" />{t("edit")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDeleteId(pkg.id)} className="flex-1 border-red-100 text-red-500 hover:bg-red-50 gap-1.5">
                <Trash2 className="w-3.5 h-3.5" />{t("delete")}
              </Button>
            </div>
            </Card>
          </Reveal>
        ))}
      </div>

      <Dialog open={!!editPkg} onOpenChange={() => setEditPkg(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Package</DialogTitle></DialogHeader>
          {editPkg && (
            <form onSubmit={handleEdit} className="space-y-3 mt-2">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">{t("name")}</label>
                <Input value={editPkg.name} onChange={e => setEditPkg({ ...editPkg, name: e.target.value })} className="h-10" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Price (֏)</label>
                <Input value={editPkg.price} onChange={e => setEditPkg({ ...editPkg, price: e.target.value })} className="h-10" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Lessons</label>
                <Input type="number" value={editPkg.lessons} onChange={e => setEditPkg({ ...editPkg, lessons: +e.target.value })} className="h-10" /></div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditPkg(null)}>Cancel</Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">Save</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Package</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3 mt-2">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">{t("name")} *</label>
              <Input value={newPkg.name} onChange={e => setNewPkg({ ...newPkg, name: e.target.value })} placeholder="e.g. Silver" className="h-10" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Price (֏) *</label>
              <Input value={newPkg.price} onChange={e => setNewPkg({ ...newPkg, price: e.target.value })} placeholder="45,000" className="h-10" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Lessons</label>
              <Input type="number" value={newPkg.lessons} onChange={e => setNewPkg({ ...newPkg, lessons: +e.target.value })} className="h-10" /></div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">{t("addNew")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Delete Package" description="Are you sure? Students enrolled in this package won't be affected." confirmLabel={t("delete")} danger />
    </AdminLayout>
  );
}
