import LessonBookingCalendar from "src/components/LessonBookingCalendar";
import { useLang } from "src/lib/i18n";
import { useEffect, useMemo, useState } from "react";
import { Card } from "src/components/ui/card";
import { useInstructors } from "src/modules/instructors/useInstructors";
import MultiSelectDropdown from "src/components/MultiSelectDropdown";
import { branchOptionLabel, branchesInCity, useBranches } from "src/modules/branches";
import { cityNameById, useCities } from "src/modules/cities";
import {
  PRACTICAL_LESSON_TYPES,
  getLessonTypeLabel,
  validatePracticalBookingSelection,
  type PracticalLessonType,
} from "src/modules/instructors/instructor-booking";
import { getFilteredInstructors } from "src/modules/instructors/instructor.api";
import { useAccount } from "src/modules/accounts";

export function DashboardBookingsPracticalTab() {
  const { t } = useLang();
  const { user } = useAccount();
  const { branches } = useBranches();
  const { cities } = useCities();
  const { instructors } = useInstructors();
  const [lessonType, setLessonType] = useState<PracticalLessonType | "">("");
  const [cityId, setCityId] = useState("");
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [instructorId, setInstructorId] = useState("");

  const branchesForCity = useMemo(() => (cityId ? branchesInCity(branches, cityId) : []), [branches, cityId]);
  const branchIdsForCity = useMemo(() => branchesForCity.map((b) => b.id), [branchesForCity]);

  const validationErrors = validatePracticalBookingSelection({
    lessonType,
    cityId,
    branchIds: selectedBranchIds,
    branchesForCity: branchIdsForCity,
  });

  const filteredInstructors = useMemo(
    () =>
      getFilteredInstructors(
        instructors,
        {
          lessonType,
          cityId,
          branchIds: selectedBranchIds,
        },
        branchIdsForCity,
      ),
    [instructors, lessonType, cityId, selectedBranchIds, branchIdsForCity],
  );

  const instructorOptions = useMemo(() => filteredInstructors.map((item) => ({ id: item.id, name: item.name })), [filteredInstructors]);

  const readyForCalendar = validationErrors.length === 0 && instructorOptions.length > 0;

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

  useEffect(() => {
    if (!instructorOptions.some((o) => o.id === instructorId)) {
      setInstructorId(instructorOptions[0]?.id ?? "");
    }
  }, [instructorId, instructorOptions]);

  return (
    <>
      <Card className="p-5 border-border mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                onChange={(next) => setSelectedBranchIds(next as string[])}
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

      {readyForCalendar ? (
        <LessonBookingCalendar
          mode="student"
          instructors={instructorOptions}
          selectedInstructorId={instructorId}
          onInstructorChange={setInstructorId}
          studentUserId={user?.accountType === "student" ? String(user.id) : undefined}
          branchId={selectedBranchIds[0] ?? ""}
        />
      ) : (
        <Card className="p-6 border-border text-sm text-muted-foreground">{t("bookingNoInstructorsByFilter")}</Card>
      )}
    </>
  );
}
