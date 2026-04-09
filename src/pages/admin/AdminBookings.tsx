import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import AdminTableRowActions, { AdminTableRowContextMenu } from "src/components/AdminTableRowActions";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { formatShortDateFromIso, todayIsoDate } from "src/lib/adminFormat";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Input } from "src/components/ui/input";
import { Button } from "src/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "src/components/ui/dialog";
import ConfirmDialog from "src/components/ConfirmDialog";
import DataTableToolbar from "src/components/DataTableToolbar";
import CsvExportButton from "src/components/CsvExportButton";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Plus, Edit2, Trash2, CalendarRange } from "lucide-react";
import { useMemo, useState } from "react";
import { branchNameById, DEFAULT_PRIMARY_BRANCH_ID, useBranches } from "src/modules/branches";
import { allInstructorNames, DEMO_STUDENTS, getStudentById } from "src/modules/admin/adminPeople";

type Booking = {
  id: string;
  studentId: string;
  instructorName: string;
  dateIso: string;
  time: string;
  type: "practical" | "theory";
  status: string;
  branchId: string;
};

const instructorNames = allInstructorNames();

const initialBookings: Booking[] = [
  { id: "BK-001", studentId: "USR-001", instructorName: "Armen Petrosyan", dateIso: "2026-03-28", time: "10:00", type: "practical", status: "confirmed", branchId: "br-garegin-8" },
  { id: "BK-002", studentId: "USR-002", instructorName: "Vardan Grigoryan", dateIso: "2026-03-28", time: "14:00", type: "practical", status: "confirmed", branchId: "br-azatamart-75" },
  { id: "BK-003", studentId: "USR-003", instructorName: "Narine Hovhannisyan", dateIso: "2026-03-29", time: "09:00", type: "theory", status: "pending", branchId: "br-masis-125" },
  { id: "BK-004", studentId: "USR-004", instructorName: "Armen Petrosyan", dateIso: "2026-03-29", time: "11:00", type: "practical", status: "cancelled", branchId: "br-garegin-8" },
  { id: "BK-005", studentId: "USR-005", instructorName: "Vardan Grigoryan", dateIso: "2026-03-30", time: "16:00", type: "practical", status: "confirmed", branchId: "br-azatamart-75" },
];

const statusColor: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-600",
};
const typeColor: Record<string, string> = {
  practical: "bg-blue-100 text-blue-700",
  theory: "bg-purple-100 text-purple-700",
};

function studentLabel(id: string): string {
  return getStudentById(id)?.name ?? id;
}

export default function AdminBookings() {
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const { branches } = useBranches();
  const [bookings, setBookings] = useState(initialBookings);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [lessonTypeFilter, setLessonTypeFilter] = useState<"all" | "practical" | "theory">("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<Booking | null>(null);

  const openAdd = () => {
    setDraft({
      id: "",
      studentId: DEMO_STUDENTS[0]?.id ?? "",
      instructorName: instructorNames[0] ?? "",
      dateIso: todayIsoDate(),
      time: "10:00",
      type: "practical",
      status: "confirmed",
      branchId: branches[0]?.id ?? DEFAULT_PRIMARY_BRANCH_ID,
    });
    setAddOpen(true);
  };

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const q = search.trim().toLowerCase();
      const branchLabel = branchNameById(branches, b.branchId);
      const stu = studentLabel(b.studentId);
      const dateLabel = formatShortDateFromIso(b.dateIso, lang);
      const hay = [b.id, stu, b.instructorName, dateLabel, b.time, b.type, b.status, branchLabel].join(" ").toLowerCase();
      const matchSearch = !q || hay.includes(q);
      const matchStatus = statusFilter === "all" || b.status === statusFilter;
      const matchBranch = branchFilter === "all" || b.branchId === branchFilter;
      const matchLessonType = lessonTypeFilter === "all" || b.type === lessonTypeFilter;
      return matchSearch && matchStatus && matchBranch && matchLessonType;
    });
  }, [bookings, search, statusFilter, branchFilter, lessonTypeFilter, branches, lang]);

  const handleDelete = () => {
    setBookings((b) => b.filter((x) => x.id !== deleteId));
    showToast(t("bookingCancelledMsg"), "success");
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBooking) return;
    setBookings((b) => b.map((x) => (x.id === editBooking.id ? editBooking : x)));
    setEditBooking(null);
    showToast(t("bookingUpdatedToast"), "success");
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    if (!draft.studentId || !draft.instructorName || !draft.dateIso) {
      showToast(t("fillRequired"), "error");
      return;
    }
    const next: Booking = {
      ...draft,
      id: `BK-${String(bookings.length + 1).padStart(3, "0")}`,
    };
    setBookings((b) => [next, ...b]);
    setAddOpen(false);
    setDraft(null);
    showToast(t("bookingCreatedToast"), "success");
  };

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={CalendarRange}
        title={t("bookings")}
        subtitle={t("adminBookingsPageSubtitle")}
        actions={
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2" onClick={openAdd}>
            <Plus className="w-4 h-4" />
            {t("addNew")}
          </Button>
        }
      />

      <Card className="border-border overflow-hidden min-w-0">
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`}>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground min-w-0 w-full sm:min-w-[11rem] sm:w-auto"
            aria-label={t("filterByBranch")}
          >
            <option value="all">{t("adminBranchFilterAll")}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            value={lessonTypeFilter}
            onChange={(e) => setLessonTypeFilter(e.target.value as "all" | "practical" | "theory")}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground min-w-0 w-full sm:min-w-[10rem] sm:w-auto"
            aria-label={t("filterByType")}
          >
            <option value="all">{t("adminBookingsFilterAllTypes")}</option>
            <option value="practical">{t("lessonTypePractical")}</option>
            <option value="theory">{t("lessonTypeTheory")}</option>
          </select>
          <div className="flex gap-2 flex-wrap">
            {["all", "confirmed", "pending", "cancelled"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                  statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-input text-muted-foreground hover:border-primary/40"
                }`}
              >
                {s === "all" ? t("filterOptionAll") : t(s as "confirmed" | "pending" | "cancelled")}
              </button>
            ))}
          </div>
          <CsvExportButton
            filename="admin-bookings.csv"
            headers={[
              t("tableColId"),
              t("bookingColStudent"),
              t("adminColBranch"),
              t("cohortColInstructor"),
              t("date"),
              t("bookingColTime"),
              t("bookingColType"),
              t("status"),
            ]}
            rows={filtered.map((b) => [
              b.id,
              studentLabel(b.studentId),
              branchNameById(branches, b.branchId),
              b.instructorName,
              formatShortDateFromIso(b.dateIso, lang),
              b.time,
              t(b.type === "theory" ? "lessonTypeTheory" : "lessonTypePractical"),
              t(b.status as "confirmed" | "pending" | "cancelled"),
            ])}
          />
        </DataTableToolbar>

        <AdminTableScroll>
          <table className="w-full text-sm min-w-[56rem]">
            <thead className="bg-muted/40">
              <tr>
                {[t("tableColId"), t("bookingColStudent"), t("adminColBranch"), t("cohortColInstructor"), t("date"), t("bookingColTime"), t("bookingColType"), t("status"), t("actions")].map((h, i) => (
                  <th key={i} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((b, i) => (
                <AdminTableRowContextMenu
                  key={i}
                  actions={[
                    {
                      kind: "item",
                      id: "edit",
                      label: t("edit"),
                      icon: Edit2,
                      onClick: () => setEditBooking({ ...b }),
                    },
                    {
                      kind: "item",
                      id: "delete",
                      label: t("delete"),
                      icon: Trash2,
                      destructive: true,
                      onClick: () => setDeleteId(b.id),
                    },
                  ]}
                >
                  <tr className="hover:bg-muted/30">
                    <td className="px-4 py-3.5 text-muted-foreground text-xs font-mono whitespace-nowrap">{b.id}</td>
                    <td className="px-4 py-3.5 font-medium text-foreground whitespace-nowrap">{studentLabel(b.studentId)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap max-w-[10rem] truncate" title={branchNameById(branches, b.branchId)}>
                      {branchNameById(branches, b.branchId)}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{b.instructorName}</td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{formatShortDateFromIso(b.dateIso, lang)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{b.time}</td>
                    <td className="px-4 py-3.5">
                      <Badge className={`text-xs ${typeColor[b.type]}`}>{t(b.type === "theory" ? "lessonTypeTheory" : "lessonTypePractical")}</Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge className={`text-xs ${statusColor[b.status]}`}>{t(b.status as "confirmed" | "pending" | "cancelled")}</Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <AdminTableRowActions
                        toolbarOnly
                        actions={[
                          {
                            kind: "item",
                            id: "edit",
                            label: t("edit"),
                            icon: Edit2,
                            onClick: () => setEditBooking({ ...b }),
                          },
                          {
                            kind: "item",
                            id: "delete",
                            label: t("delete"),
                            icon: Trash2,
                            destructive: true,
                            onClick: () => setDeleteId(b.id),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                </AdminTableRowContextMenu>
              ))}
            </tbody>
          </table>
        </AdminTableScroll>
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          {t("panelShowingLabel")} {filtered.length} / {bookings.length} {t("bookings")}
        </div>
      </Card>

      <Dialog open={!!editBooking} onOpenChange={() => setEditBooking(null)}>
        <DialogContent className="max-w-md max-h-[min(90vh,720px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("bookingDialogEditTitle")}</DialogTitle>
          </DialogHeader>
          {editBooking && (
            <form onSubmit={handleEdit} className="space-y-3 mt-2">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("bookingColStudent")}</label>
                <select
                  value={editBooking.studentId}
                  onChange={(e) => setEditBooking({ ...editBooking, studentId: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {DEMO_STUDENTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminSelectBranch")}</label>
                <select
                  value={editBooking.branchId}
                  onChange={(e) => setEditBooking({ ...editBooking, branchId: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {branches.map((br) => (
                    <option key={br.id} value={br.id}>
                      {br.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortColInstructor")}</label>
                <select
                  value={editBooking.instructorName}
                  onChange={(e) => setEditBooking({ ...editBooking, instructorName: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {instructorNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("bookingColType")}</label>
                <select
                  value={editBooking.type}
                  onChange={(e) => setEditBooking({ ...editBooking, type: e.target.value as "practical" | "theory" })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="practical">{t("lessonTypePractical")}</option>
                  <option value="theory">{t("lessonTypeTheory")}</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t("date")}</label>
                  <Input type="date" value={editBooking.dateIso} onChange={(e) => setEditBooking({ ...editBooking, dateIso: e.target.value })} className="h-10" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t("bookingColTime")}</label>
                  <Input type="time" value={editBooking.time} onChange={(e) => setEditBooking({ ...editBooking, time: e.target.value })} className="h-10" step={60} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("status")}</label>
                <select
                  value={editBooking.status}
                  onChange={(e) => setEditBooking({ ...editBooking, status: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="confirmed">{t("confirmed")}</option>
                  <option value="pending">{t("pending")}</option>
                  <option value="cancelled">{t("cancelled")}</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditBooking(null)}>
                  {t("cancel")}
                </Button>
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                  {t("save")}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md max-h-[min(90vh,720px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("bookingDialogAddTitle")}</DialogTitle>
          </DialogHeader>
          {draft && (
            <form onSubmit={handleAdd} className="space-y-3 mt-2">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("bookingColStudent")}</label>
                <select
                  value={draft.studentId}
                  onChange={(e) => setDraft({ ...draft, studentId: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {DEMO_STUDENTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminSelectBranch")}</label>
                <select
                  value={draft.branchId}
                  onChange={(e) => setDraft({ ...draft, branchId: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {branches.map((br) => (
                    <option key={br.id} value={br.id}>
                      {br.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortColInstructor")}</label>
                <select
                  value={draft.instructorName}
                  onChange={(e) => setDraft({ ...draft, instructorName: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {instructorNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("bookingColType")}</label>
                <select
                  value={draft.type}
                  onChange={(e) => setDraft({ ...draft, type: e.target.value as "practical" | "theory" })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="practical">{t("lessonTypePractical")}</option>
                  <option value="theory">{t("lessonTypeTheory")}</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t("date")}</label>
                  <Input type="date" value={draft.dateIso} onChange={(e) => setDraft({ ...draft, dateIso: e.target.value })} className="h-10" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t("bookingColTime")}</label>
                  <Input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} className="h-10" step={60} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("status")}</label>
                <select
                  value={draft.status}
                  onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="confirmed">{t("confirmed")}</option>
                  <option value="pending">{t("pending")}</option>
                  <option value="cancelled">{t("cancelled")}</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                  {t("addNew")}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t("bookingCancelTitle")}
        description={t("bookingCancelDesc")}
        confirmLabel={t("delete")}
        danger
      />
    </AdminLayout>
  );
}
