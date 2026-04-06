import AdminLayout from "src/components/AdminLayout";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Card } from "src/components/ui/card";
import PanelPageHeader from "src/components/PanelPageHeader";
import LessonBookingCalendar from "src/components/LessonBookingCalendar";
import { instructors as instructorRecords } from "src/data/instructors";
import { Link } from "wouter";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { useMemo, useState } from "react";
import { Reveal } from "src/lib/motion";
import { branchNameById, DEFAULT_PRIMARY_BRANCH_ID, useBranches } from "src/modules/branches";

const demoStudents = [
  { id: "USR-001", name: "Ani Karapetyan" },
  { id: "USR-002", name: "Tigran Mkhitaryan" },
  { id: "USR-003", name: "Nare Harutyunyan" },
  { id: "USR-004", name: "Suren Danielyan" },
  { id: "USR-005", name: "Mane Poghosyan" },
  { id: "USR-006", name: "Artak Sargsyan" },
];

export default function AdminLearnPractical() {
  const { t } = useLang();
  const { showToast } = useToast();
  const { branches } = useBranches();
  const practicalNames = useMemo(
    () => instructorRecords.filter((i) => i.teachesPractical).map((i) => i.name),
    [],
  );
  const [instructor, setInstructor] = useState(practicalNames[0] ?? "");
  const [studentId, setStudentId] = useState(demoStudents[0]?.id ?? "");
  const [branchId, setBranchId] = useState(DEFAULT_PRIMARY_BRANCH_ID);

  const studentName = demoStudents.find((s) => s.id === studentId)?.name ?? "";

  return (
    <AdminLayout>
      <div className="mb-4">
        <Link
          href="/admin/learn"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("adminLearnHubTitle")}
        </Link>
      </div>

      <Reveal>
        <PanelPageHeader icon={CalendarClock} title={t("adminLearnPracticalTitle")} subtitle={t("adminLearnPracticalSubtitle")} />
      </Reveal>

      <Reveal delay={0.05}>
        <Card className="p-5 border-border mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("adminLearnStudentFieldLabel")}</label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {demoStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("adminSelectBranch")}</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">{t("adminLearnManualBookingNote")}</p>
        </Card>
      </Reveal>

      <LessonBookingCalendar
        mode="admin"
        instructorNames={practicalNames}
        selectedInstructor={instructor}
        onInstructorChange={setInstructor}
        studentName={studentName}
        onBookingConfirmed={({ instructor: ins, dateIso, time, studentLabel }) => {
          const branch = branchNameById(branches, branchId);
          showToast(
            `${t("adminPracticalBookedToast")} ${studentLabel} · ${ins} · ${dateIso} ${time} · ${branch}`,
            "success",
          );
        }}
      />
    </AdminLayout>
  );
}
