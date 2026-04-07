import AdminLayout from "src/components/AdminLayout";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Card } from "src/components/ui/card";
import PanelPageHeader from "src/components/PanelPageHeader";
import LessonBookingCalendar from "src/components/LessonBookingCalendar";
import { instructors as instructorRecords } from "src/data/instructors";
import { Link } from "wouter";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Reveal } from "src/lib/motion";
import { branchNameById, DEFAULT_PRIMARY_BRANCH_ID, useBranches } from "src/modules/branches";
import { DEMO_STUDENTS } from "src/modules/admin/adminPeople";
import { useAdminLearnSearchParams } from "src/lib/adminLearnSearchParams";
import MultiSelectDropdown from "src/components/MultiSelectDropdown";
import {
  ARMENIA_REGIONS,
  YEREVAN_DISTRICTS,
  PRACTICAL_LESSON_TYPES,
  getRegionLabel,
  getYerevanDistrictLabel,
  getLessonTypeLabel,
  validatePracticalBookingSelection,
  type ArmeniaRegion,
  type PracticalLessonType,
  type YerevanDistrict,
} from "src/modules/instructors/instructor-booking";
import { getFilteredInstructors } from "src/modules/instructors/instructor.api";

export default function AdminLearnPractical() {
  const { t } = useLang();
  const { showToast } = useToast();
  const { branches } = useBranches();
  const { studentId: studentFromQuery, branchId: branchFromQuery } = useAdminLearnSearchParams();
  const [lessonType, setLessonType] = useState<PracticalLessonType | "">("");
  const [region, setRegion] = useState<ArmeniaRegion | "">("");
  const [districts, setDistricts] = useState<YerevanDistrict[]>([]);
  const [instructor, setInstructor] = useState("");
  const [studentId, setStudentId] = useState(DEMO_STUDENTS[0]?.id ?? "");
  const [branchId, setBranchId] = useState(DEFAULT_PRIMARY_BRANCH_ID);

  const filteredInstructors = useMemo(
    () =>
      getFilteredInstructors(instructorRecords, {
        lessonType,
        region,
        districts,
      }),
    [lessonType, region, districts],
  );
  const practicalNames = filteredInstructors.map((item) => item.name);
  const validationErrors = validatePracticalBookingSelection({ lessonType, region, districts });
  const readyForCalendar = validationErrors.length === 0 && practicalNames.length > 0;

  useEffect(() => {
    if (studentFromQuery) setStudentId(studentFromQuery);
  }, [studentFromQuery]);

  useEffect(() => {
    if (branchFromQuery && branches.some((b) => b.id === branchFromQuery)) {
      setBranchId(branchFromQuery);
    }
  }, [branchFromQuery, branches]);

  useEffect(() => {
    if (!practicalNames.includes(instructor)) {
      setInstructor(practicalNames[0] ?? "");
    }
  }, [instructor, practicalNames]);

  const studentName = DEMO_STUDENTS.find((s) => s.id === studentId)?.name ?? "";

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
          {(studentFromQuery || branchFromQuery) && (
            <p className="text-xs text-muted-foreground mb-4 rounded-lg bg-muted/50 px-3 py-2 border border-border/60">
              {t("adminLearnStudentFromQueryHint")}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("bookingStepLessonType")}</label>
              <select
                value={lessonType}
                onChange={(e) => setLessonType(e.target.value as PracticalLessonType | "")}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="">{t("bookingSelectLessonTypePlaceholder")}</option>
                {PRACTICAL_LESSON_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {getLessonTypeLabel(value)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("bookingStepRegion")}</label>
              <select
                value={region}
                onChange={(e) => {
                  const nextRegion = e.target.value as ArmeniaRegion | "";
                  setRegion(nextRegion);
                  if (nextRegion !== "Yerevan") setDistricts([]);
                }}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="">{t("bookingSelectRegionPlaceholder")}</option>
                {ARMENIA_REGIONS.map((value) => (
                  <option key={value} value={value}>
                    {getRegionLabel(value)}
                  </option>
                ))}
              </select>
            </div>
            {region === "Yerevan" && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("bookingStepDistricts")}</label>
                <MultiSelectDropdown
                  options={YEREVAN_DISTRICTS.map((value) => ({
                    value,
                    label: getYerevanDistrictLabel(value),
                  }))}
                  value={districts}
                  onChange={(next) => setDistricts(next as YerevanDistrict[])}
                  placeholder={t("bookingStepDistricts")}
                  ariaLabel={t("bookingStepDistricts")}
                />
              </div>
            )}
          </div>
          {validationErrors.length > 0 && (
            <p className="text-xs text-amber-600 mt-3">{t("bookingCompleteFiltersHint")}</p>
          )}
          <p className="text-xs text-muted-foreground mt-3">{t("adminLearnManualBookingNote")}</p>
        </Card>
      </Reveal>

      {readyForCalendar ? (
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
      ) : (
        <Card className="p-6 border-border text-sm text-muted-foreground">{t("bookingNoInstructorsByFilter")}</Card>
      )}
    </AdminLayout>
  );
}
