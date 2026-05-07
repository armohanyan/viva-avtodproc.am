import { useEffect, useMemo, useState } from "react";
import LessonBookingCalendar from "src/components/LessonBookingCalendar";
import MultiSelectDropdown from "src/components/MultiSelectDropdown";
import { Card } from "src/components/ui/card";
import { branchOptionLabel, branchesInCity, useBranches } from "src/modules/branches";
import { cityNameById, useCities } from "src/modules/cities";
import { useInstructors } from "src/modules/instructors/useInstructors";
import { useAccount } from "src/modules/accounts";
import { useLang } from "src/lib/i18n";
import { defaultExamQuestionMeta, loadExamQuestionMeta } from "src/lib/examQuestionMeta";

export function DashboardBookingsTheoryPersonalTab() {
  const { t } = useLang();
  const { user } = useAccount();
  const { branches } = useBranches();
  const { cities } = useCities();
  const { instructors } = useInstructors();
  const [cityId, setCityId] = useState("");
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [instructorId, setInstructorId] = useState("");
  const [themes, setThemes] = useState<string[]>([]);

  const [theoryThemes, setTheoryThemes] = useState<string[]>(() => defaultExamQuestionMeta().thematicCardTitles);
  const theoryInstructors = useMemo(
    () => instructors.filter((i) => i.status === "active" && i.teachesTheory),
    [instructors],
  );
  const branchesForCity = useMemo(() => (cityId ? branchesInCity(branches, cityId) : []), [branches, cityId]);
  const branchIdsForCity = useMemo(() => branchesForCity.map((b) => b.id), [branchesForCity]);
  const filteredInstructors = useMemo(
    () =>
      theoryInstructors.filter((ins) => {
        if (!cityId) return false;
        if (selectedBranchIds.length > 0) {
          return selectedBranchIds.some((branchId) => ins.availableBranchIds.includes(branchId));
        }
        return ins.availableBranchIds.some((branchId) => branchIdsForCity.includes(branchId));
      }),
    [theoryInstructors, cityId, selectedBranchIds, branchIdsForCity],
  );

  useEffect(() => {
    if (!cityId) {
      setSelectedBranchIds([]);
      return;
    }
    setSelectedBranchIds((prev) => prev.filter((id) => branchIdsForCity.includes(id)));
  }, [cityId, branchIdsForCity]);

  useEffect(() => {
    if (!filteredInstructors.some((x) => x.id === instructorId)) {
      setInstructorId(filteredInstructors[0]?.id ?? "");
    }
  }, [filteredInstructors, instructorId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const meta = await loadExamQuestionMeta();
      if (!cancelled && Array.isArray(meta.thematicCardTitles)) {
        setTheoryThemes(meta.thematicCardTitles);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = cityId && (selectedBranchIds.length > 0 || branchIdsForCity.length > 0) && filteredInstructors.length > 0;

  return (
    <>
      <Card className="p-5 border-border mb-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          {cityId && branchesForCity.length > 0 ? (
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
          ) : null}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("bookingTheoryThemesTitle")}</label>
            <MultiSelectDropdown
              options={theoryThemes.map((title) => ({ value: title, label: title }))}
              value={themes}
              onChange={(next) => setThemes(next as string[])}
              placeholder={t("bookingTheoryThemesTitle")}
              ariaLabel={t("bookingTheoryThemesTitle")}
            />
          </div>
        </div>
      </Card>

      {ready ? (
        <LessonBookingCalendar
          mode="student"
          studentBookingType="theory_personal"
          instructors={filteredInstructors}
          selectedInstructorId={instructorId}
          onInstructorChange={setInstructorId}
          studentUserId={user?.accountType === "student" ? String(user.id) : undefined}
          branchId={selectedBranchIds[0] ?? branchIdsForCity[0] ?? ""}
          instructorPickerVariant="cards"
        />
      ) : (
        <Card className="p-6 border-border text-sm text-muted-foreground">{t("bookingNoInstructorsByFilter")}</Card>
      )}
    </>
  );
}
