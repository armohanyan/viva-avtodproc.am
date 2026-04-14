import DashboardLayout from "src/components/DashboardLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import LessonBookingCalendar from "src/components/LessonBookingCalendar";
import DashboardBookingsSubnav from "src/components/dashboard/DashboardBookingsSubnav";
import { useLang } from "src/lib/i18n";
import { CalendarClock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Reveal } from "src/lib/motion";
import { Card } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { Link } from "wouter";
import { useStudentEntitlements } from "src/modules/dashboard/studentEntitlements";
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

export default function DashboardBookingsPractical() {
  const { t } = useLang();
  const { user } = useAccount();
  const { branches } = useBranches();
  const { cities } = useCities();
  const { instructors } = useInstructors();
  const { practicalCreditsRemaining, packagePracticalRemaining, extraPracticalRemaining } = useStudentEntitlements();

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
    <DashboardLayout>
      <Reveal>
        <PanelPageHeader
          icon={CalendarClock}
          title={t("bookingsSubnavPractical")}
          subtitle={t("bookingsPracticalPageSubtitle")}
          actions={
            <Link href="/dashboard/purchases">
              <Button type="button" variant="outline" size="sm" className="border-input">
                {t("bookingsViewMyServices")}
              </Button>
            </Link>
          }
        />
      </Reveal>

      <Reveal delay={0.04}>
        <DashboardBookingsSubnav active="practical" />
      </Reveal>

      <Reveal delay={0.06}>
        <Card className="p-5 border-border mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{t("bookingsCreditsSummary")}</p>
              <p className="text-2xl font-bold text-foreground tabular-nums mt-1">{practicalCreditsRemaining}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("bookingsCreditsPackagePart")}: {packagePracticalRemaining} · {t("bookingsCreditsExtraPart")}: {extraPracticalRemaining}
              </p>
            </div>
            {practicalCreditsRemaining === 0 ? (
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300 max-w-md">
                <p>{t("bookingsNoCreditsWarning")}</p>
                <Link href="/dashboard/bookings/package" className="inline-block mt-2 text-primary font-medium hover:underline">
                  {t("bookingsGoToPackageTab")}
                </Link>
              </div>
            ) : null}
          </div>
        </Card>
      </Reveal>

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
          studentUserId={user?.accountType === "student" ? user.id : undefined}
        />
      ) : (
        <Card className="p-6 border-border text-sm text-muted-foreground">{t("bookingNoInstructorsByFilter")}</Card>
      )}
    </DashboardLayout>
  );
}
