import AdminLayout from "src/components/AdminLayout";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { formatCohortSessionTimeLabel, formatShortDateFromIso } from "src/lib/adminFormat";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { AppModal } from "src/components/AppModal";
import PanelPageHeader from "src/components/PanelPageHeader";
import { UsersRound } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Reveal } from "src/lib/motion";
import { branchNameById, useBranches } from "src/modules/branches";
import { useAdminLearnSearchParams } from "src/lib/adminLearnSearchParams";
import AdminStudentSearchSelect from "src/components/admin/AdminStudentSearchSelect";
import { useAdminStudentsMini } from "src/modules/admin/useAdminStudents";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";

type Cohort = {
  id: string;
  name: string;
  startDateIso: string;
  endDateIso: string;
  seats: number;
  enrolled: number;
  instructorName: string;
  meetLink: string;
  status: string;
  branchId: string;
  sessionStartTime: string | null;
  sessionEndTime: string | null;
};

export default function AdminLearnTheory() {
  const enrollFormId = useId();
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const { branches } = useBranches();
  const { students, loading: studentsLoading } = useAdminStudentsMini();
  const { studentId: studentFromQuery } = useAdminLearnSearchParams();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [dialogCohortId, setDialogCohortId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState("");

  const refreshCohorts = useCallback(async () => {
    try {
      const data = await vivaApiJson<Cohort[]>("/theory-cohorts");
      setCohorts(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  }, [showToast]);

  useEffect(() => {
    void refreshCohorts();
  }, [refreshCohorts]);

  useEffect(() => {
    if (students.length === 0) {
      setStudentId("");
      return;
    }
    const fromQueryOk = studentFromQuery && students.some((s) => s.id === studentFromQuery);
    if (fromQueryOk) {
      setStudentId(studentFromQuery);
      return;
    }
    setStudentId((prev) => (prev && students.some((s) => s.id === prev) ? prev : students[0]!.id));
  }, [students, studentFromQuery]);

  /** Cohorts admins can enroll students into (matches AdminCohorts: new rows default to `upcoming`). */
  const enrollableGroups = useMemo(
    () => cohorts.filter((c) => c.status === "active" || c.status === "upcoming"),
    [cohorts],
  );

  const dialogCohort = dialogCohortId ? cohorts.find((c) => c.id === dialogCohortId) : null;
  const seatsLeft = dialogCohort ? dialogCohort.seats - dialogCohort.enrolled : 0;

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dialogCohortId || !dialogCohort) return;
    if (dialogCohort.enrolled >= dialogCohort.seats) {
      showToast(t("adminTheoryGroupFullHint"), "error");
      return;
    }
    const studentName = students.find((s) => s.id === studentId)?.name ?? "";
    try {
      await vivaApiJson(`/theory-cohorts/${encodeURIComponent(dialogCohortId)}/enrollments`, {
        method: "POST",
        body: { studentUserId: studentId },
      });
      setDialogCohortId(null);
      showToast(`${t("adminTheoryEnrolledToast")} ${studentName} → ${dialogCohort.name}`, "success");
      await refreshCohorts();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    }
  };

  return (
    <AdminLayout>
      <Reveal>
        <PanelPageHeader icon={UsersRound} title={t("adminLearnTheoryTitle")} subtitle={t("adminLearnTheorySubtitle")} />
      </Reveal>

      {studentFromQuery && (
        <p className="text-xs text-muted-foreground mb-4 rounded-lg bg-muted/50 px-3 py-2 border border-border/60 max-w-2xl">
          {t("adminLearnStudentFromQueryHint")}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {enrollableGroups.length === 0 ? (
          <Card className="p-8 border-border text-center text-muted-foreground">{t("adminTheoryNoActiveGroups")}</Card>
        ) : (
          enrollableGroups.map((c, idx) => {
            const full = c.enrolled >= c.seats;
            const isActive = c.status === "active";
            return (
              <Reveal key={c.id} delay={idx * 0.06}>
                <Card className="p-5 border-border h-full flex flex-col min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground">{c.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{branchNameById(branches, c.branchId)}</p>
                    </div>
                    <Badge
                      className={
                        isActive ? "shrink-0 bg-emerald-100 text-emerald-700" : "shrink-0 bg-blue-100 text-blue-700"
                      }
                    >
                      {isActive ? t("active") : t("cohortStatusLabelUpcoming")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    {formatShortDateFromIso(c.startDateIso, lang)} – {formatShortDateFromIso(c.endDateIso, lang)}
                    {formatCohortSessionTimeLabel(c.sessionStartTime, c.sessionEndTime) ? (
                      <span className="block mt-1 text-foreground/90">
                        {formatCohortSessionTimeLabel(c.sessionStartTime, c.sessionEndTime)}
                      </span>
                    ) : null}
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

      <AppModal
        open={!!dialogCohortId}
        onOpenChange={(open) => !open && setDialogCohortId(null)}
        title={t("adminTheoryDialogTitle")}
        contentClassName="max-w-md"
        footer={
          dialogCohort ? (
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogCohortId(null)}>
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                form={enrollFormId}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={seatsLeft <= 0}
              >
                {t("adminTheoryEnrollCta")}
              </Button>
            </div>
          ) : null
        }
      >
        {dialogCohort && (
          <form id={enrollFormId} onSubmit={handleEnroll} className="space-y-4">
            <div className="rounded-lg bg-muted/40 p-3 text-sm">
              <p className="font-medium text-foreground">{dialogCohort.name}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {t("cohortColEnrollment")}: {dialogCohort.enrolled} / {dialogCohort.seats}
                {seatsLeft > 0 ? ` · ${seatsLeft} ${t("adminTheorySeatsLeft")}` : ""}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("adminLearnStudentFieldLabel")}</label>
              <AdminStudentSearchSelect
                students={students}
                value={studentId}
                onChange={setStudentId}
                disabled={studentsLoading}
                searchPlaceholder={t("adminStudentPickerSearchPlaceholder")}
                selectPlaceholder={t("adminStudentPickerSelectPlaceholder")}
                noResultsLabel={t("tableNoMatches")}
                emptyListLabel={t("adminStudentPickerNoStudents")}
              />
            </div>
          </form>
        )}
      </AppModal>
    </AdminLayout>
  );
}
