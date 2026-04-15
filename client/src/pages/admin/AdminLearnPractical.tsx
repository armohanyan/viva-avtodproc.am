import AdminLayout from "src/components/AdminLayout";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Card } from "src/components/ui/card";
import PanelPageHeader from "src/components/PanelPageHeader";
import LessonBookingCalendar from "src/components/LessonBookingCalendar";
import { CalendarClock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Reveal } from "src/lib/motion";
import {
  branchNameById,
  branchOptionLabel,
  branchesInCity,
  DEFAULT_PRIMARY_BRANCH_ID,
  useBranches,
} from "src/modules/branches";
import { cityNameById, useCities } from "src/modules/cities";
import { useAdminLearnSearchParams } from "src/lib/adminLearnSearchParams";
import { useAdminStudentsMini } from "src/modules/admin/useAdminStudents";
import { useInstructors } from "src/modules/instructors/useInstructors";
import MultiSelectDropdown from "src/components/MultiSelectDropdown";
import {
  PRACTICAL_LESSON_TYPES,
  getLessonTypeLabel,
  validatePracticalBookingSelection,
  type PracticalLessonType,
} from "src/modules/instructors/instructor-booking";
import { getFilteredInstructors } from "src/modules/instructors/instructor.api";

export default function AdminLearnPractical() {
  const { t } = useLang();
  const { showToast } = useToast();
  const { branches } = useBranches();
  const { cities } = useCities();
  const { students } = useAdminStudentsMini();
  const { instructors: instructorRecords } = useInstructors();
  const { studentId: studentFromQuery, branchId: branchFromQuery } = useAdminLearnSearchParams();
  const [lessonType, setLessonType] = useState<PracticalLessonType | "">("");
  const [cityId, setCityId] = useState("");
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [instructorId, setInstructorId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [branchId, setBranchId] = useState(DEFAULT_PRIMARY_BRANCH_ID);

  const branchesForCity = useMemo(() => (cityId ? branchesInCity(branches, cityId) : []), [branches, cityId]);
  const branchIdsForCity = useMemo(() => branchesForCity.map((b) => b.id), [branchesForCity]);

  const filteredInstructors = useMemo(
    () =>
      getFilteredInstructors(
        instructorRecords,
        {
          lessonType,
          cityId,
          branchIds: selectedBranchIds,
        },
        branchIdsForCity,
      ),
    [lessonType, cityId, selectedBranchIds, branchIdsForCity, instructorRecords],
  );
  const instructorOptions = useMemo(() => filteredInstructors.map((item) => ({ id: item.id, name: item.name })), [filteredInstructors]);
  const validationErrors = validatePracticalBookingSelection({
    lessonType,
    cityId,
    branchIds: selectedBranchIds,
    branchesForCity: branchIdsForCity,
  });
  const readyForCalendar = validationErrors.length === 0 && instructorOptions.length > 0;

  useEffect(() => {
    if (studentFromQuery) setStudentId(studentFromQuery);
  }, [studentFromQuery]);

  useEffect(() => {
    setStudentId((prev) => prev || students[0]?.id || "");
  }, [students]);

  useEffect(() => {
    if (branchFromQuery && branches.some((b) => b.id === branchFromQuery)) {
      setBranchId(branchFromQuery);
    }
  }, [branchFromQuery, branches]);

  useEffect(() => {
    if (!instructorOptions.some((o) => o.id === instructorId)) {
      setInstructorId(instructorOptions[0]?.id ?? "");
    }
  }, [instructorId, instructorOptions]);

  useEffect(() => {
    if (!cityId) {
      setSelectedBranchIds([]);
      return;
    }
    setSelectedBranchIds((prev) => {
      const allowed = new Set(branchIdsForCity);
      return prev.filter((id) => allowed.has(id));
    });
  }, [cityId, branchIdsForCity]);

  const studentName = students.find((s) => s.id === studentId)?.name ?? "";
  const toastBranchId = selectedBranchIds[0] ?? branchId;

  return (
    <AdminLayout>
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
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
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
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("bookingStepCity")}</label>
              <select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="">{t("bookingSelectCityPlaceholder")}</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {cityId && branchesForCity.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("bookingStepBranches")}</label>
                <MultiSelectDropdown
                  options={branchesForCity.map((b) => ({
                    value: b.id,
                    label: branchOptionLabel(b, cityNameById(cities, b.cityId)),
                  }))}
                  value={selectedBranchIds}
                  onChange={(next) => {
                    const ids = next as string[];
                    setSelectedBranchIds(ids);
                    if (ids[0]) setBranchId(ids[0]);
                  }}
                  placeholder={t("bookingStepBranches")}
                  ariaLabel={t("bookingStepBranches")}
                />
              </div>
            )}
          </div>
          {cityId && branchesForCity.length === 0 && (
            <p className="text-xs text-muted-foreground mt-3">{t("bookingNoBranchesInCityHint")}</p>
          )}
        </Card>
      </Reveal>

      {readyForCalendar ? (
        <LessonBookingCalendar
          mode="admin"
          instructors={instructorOptions}
          selectedInstructorId={instructorId}
          onInstructorChange={setInstructorId}
          studentName={studentName}
          onBookingConfirmed={({ instructor: ins, dateIso, time, studentLabel }) => {
            const branch = branchNameById(branches, toastBranchId);
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
