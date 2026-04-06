import AdminLayout from "src/components/AdminLayout";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { formatShortDateFromIso } from "src/lib/adminFormat";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "src/components/ui/dialog";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Link } from "wouter";
import { ArrowLeft, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Reveal } from "src/lib/motion";
import { branchNameById, useBranches } from "src/modules/branches";
import { DEMO_STUDENTS } from "src/modules/admin/adminPeople";
import { useAdminLearnSearchParams } from "src/lib/adminLearnSearchParams";

type Cohort = {
  id: string;
  name: string;
  startDateIso: string;
  endDateIso: string;
  schedule: string;
  seats: number;
  enrolled: number;
  instructorName: string;
  meetLink: string;
  status: string;
  branchId: string;
};

const initialCohorts: Cohort[] = [
  {
    id: "COH-012",
    name: "Theory Cohort 12",
    startDateIso: "2026-03-20",
    endDateIso: "2026-04-10",
    schedule: "Tue & Thu, 18:00–20:00",
    seats: 12,
    enrolled: 10,
    instructorName: "Narine Hovhannisyan",
    meetLink: "https://meet.google.com/abc-def",
    status: "active",
    branchId: "br-garegin-8",
  },
  {
    id: "COH-013",
    name: "Theory Cohort 13",
    startDateIso: "2026-04-15",
    endDateIso: "2026-05-05",
    schedule: "Mon & Wed, 18:00–20:00",
    seats: 15,
    enrolled: 3,
    instructorName: "Vardan Grigoryan",
    meetLink: "https://meet.google.com/xyz-123",
    status: "upcoming",
    branchId: "br-azatamart-75",
  },
  {
    id: "COH-011",
    name: "Theory Cohort 11",
    startDateIso: "2026-02-01",
    endDateIso: "2026-02-21",
    schedule: "Mon & Wed, 17:00–19:00",
    seats: 12,
    enrolled: 12,
    instructorName: "Narine Hovhannisyan",
    meetLink: "",
    status: "completed",
    branchId: "br-masis-125",
  },
];

export default function AdminLearnTheory() {
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const { branches } = useBranches();
  const { studentId: studentFromQuery } = useAdminLearnSearchParams();
  const [cohorts, setCohorts] = useState(initialCohorts);
  const [dialogCohortId, setDialogCohortId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState(DEMO_STUDENTS[0]?.id ?? "");

  useEffect(() => {
    if (studentFromQuery) setStudentId(studentFromQuery);
  }, [studentFromQuery]);

  const activeGroups = useMemo(() => cohorts.filter((c) => c.status === "active"), [cohorts]);

  const dialogCohort = dialogCohortId ? cohorts.find((c) => c.id === dialogCohortId) : null;
  const seatsLeft = dialogCohort ? dialogCohort.seats - dialogCohort.enrolled : 0;

  const handleEnroll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dialogCohortId || !dialogCohort) return;
    if (dialogCohort.enrolled >= dialogCohort.seats) {
      showToast(t("adminTheoryGroupFullHint"), "error");
      return;
    }
    const studentName = DEMO_STUDENTS.find((s) => s.id === studentId)?.name ?? "";
    setCohorts((prev) => prev.map((c) => (c.id === dialogCohortId ? { ...c, enrolled: c.enrolled + 1 } : c)));
    setDialogCohortId(null);
    showToast(`${t("adminTheoryEnrolledToast")} ${studentName} → ${dialogCohort.name}`, "success");
  };

  return (
    <AdminLayout>
      <div className="mb-4">
        <Link href="/admin/learn" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {t("adminLearnHubTitle")}
        </Link>
      </div>

      <Reveal>
        <PanelPageHeader icon={UsersRound} title={t("adminLearnTheoryTitle")} subtitle={t("adminLearnTheorySubtitle")} />
      </Reveal>

      {studentFromQuery && (
        <p className="text-xs text-muted-foreground mb-4 rounded-lg bg-muted/50 px-3 py-2 border border-border/60 max-w-2xl">
          {t("adminLearnStudentFromQueryHint")}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {activeGroups.length === 0 ? (
          <Card className="p-8 border-border text-center text-muted-foreground">{t("adminTheoryNoActiveGroups")}</Card>
        ) : (
          activeGroups.map((c, idx) => {
            const full = c.enrolled >= c.seats;
            return (
              <Reveal key={c.id} delay={idx * 0.06}>
                <Card className="p-5 border-border h-full flex flex-col min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground">{c.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{branchNameById(branches, c.branchId)}</p>
                    </div>
                    <Badge className="shrink-0 bg-emerald-100 text-emerald-700">{t("active")}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{c.schedule}</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    {formatShortDateFromIso(c.startDateIso, lang)} – {formatShortDateFromIso(c.endDateIso, lang)}
                  </p>
                  <div className="flex items-center justify-between text-sm mt-auto pt-2 border-t border-border gap-2">
                    <span className="text-muted-foreground shrink-0">{t("cohortColInstructor")}</span>
                    <span className="font-medium text-foreground text-right min-w-0">{c.instructorName}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-muted-foreground">{t("cohortColEnrollment")}</span>
                    <span className="font-medium text-foreground">
                      {c.enrolled} / {c.seats}
                    </span>
                  </div>
                  <Button className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={full} onClick={() => setDialogCohortId(c.id)}>
                    {full ? t("adminTheoryGroupFull") : t("adminTheoryEnrollCta")}
                  </Button>
                </Card>
              </Reveal>
            );
          })
        )}
      </div>

      <Dialog open={!!dialogCohortId} onOpenChange={(open) => !open && setDialogCohortId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("adminTheoryDialogTitle")}</DialogTitle>
          </DialogHeader>
          {dialogCohort && (
            <form onSubmit={handleEnroll} className="space-y-4 mt-2">
              <div className="rounded-lg bg-muted/40 p-3 text-sm">
                <p className="font-medium text-foreground">{dialogCohort.name}</p>
                <p className="text-muted-foreground text-xs mt-1">{dialogCohort.schedule}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {t("cohortColEnrollment")}: {dialogCohort.enrolled} / {dialogCohort.seats}
                  {seatsLeft > 0 ? ` · ${seatsLeft} ${t("adminTheorySeatsLeft")}` : ""}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("adminLearnStudentFieldLabel")}</label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {DEMO_STUDENTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogCohortId(null)}>
                  {t("cancel")}
                </Button>
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={seatsLeft <= 0}>
                  {t("adminTheoryEnrollCta")}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
