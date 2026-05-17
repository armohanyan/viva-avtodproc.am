import { useEffect, useMemo, useState } from "react";
import { Reveal } from "src/lib/motion";
import InstructorCard from "src/components/InstructorCard";
import MultiSelectDropdown from "src/components/MultiSelectDropdown";
import { TheoryPersonalRequestModal } from "src/components/booking/TheoryPersonalRequestModal";
import StudentTheoryPersonalBookingsPanel from "src/components/dashboard/StudentTheoryPersonalBookingsPanel";
import StudentTheoryPersonalRequestsPanel from "src/components/dashboard/StudentTheoryPersonalRequestsPanel";
import { Card } from "src/components/ui/card";
import { branchOptionLabel, branchesInCity, useBranches } from "src/modules/branches";
import { cityNameById, useCities } from "src/modules/cities";
import { useInstructors } from "src/modules/instructors/useInstructors";
import { defaultExamQuestionMeta, loadExamQuestionMeta } from "src/lib/examQuestionMeta";
import { useLang } from "src/lib/i18n";
import type { Instructor } from "src/data/instructors";

export function DashboardBookingsTheoryPersonalTab() {
  const { t } = useLang();
  const { branches } = useBranches();
  const { cities } = useCities();
  const { instructors } = useInstructors();
  const [cityId, setCityId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [themes, setThemes] = useState<string[]>([]);
  const [theoryThemes, setTheoryThemes] = useState<string[]>(() => defaultExamQuestionMeta().thematicCardTitles);
  const [requestInstructor, setRequestInstructor] = useState<Instructor | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);

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
        if (selectedBranchId) {
          return ins.availableBranchIds.includes(selectedBranchId);
        }
        return ins.availableBranchIds.some((branchId) => branchIdsForCity.includes(branchId));
      }),
    [theoryInstructors, cityId, selectedBranchId, branchIdsForCity],
  );

  useEffect(() => {
    if (!cityId) {
      setSelectedBranchId("");
      return;
    }
    setSelectedBranchId((prev) => {
      if (prev && branchIdsForCity.includes(prev)) return prev;
      if (branchIdsForCity.length === 1) return branchIdsForCity[0] ?? "";
      return "";
    });
  }, [cityId, branchIdsForCity]);

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

  const filtersReady = Boolean(cityId && selectedBranchId && filteredInstructors.length > 0);

  const openRequestFor = (instructor: Instructor) => {
    setRequestInstructor(instructor);
    setRequestModalOpen(true);
  };

  return (
    <>
      <StudentTheoryPersonalBookingsPanel />
      <StudentTheoryPersonalRequestsPanel />
      <Reveal delay={0.06}>
        <h2 className="text-base font-semibold text-foreground mb-3">{t("bookingsTheoryPersonalNewRequestTitle")}</h2>
      </Reveal>
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
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("adminColBranch")}</label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="">{t("financeSelectBranchPlaceholder")}</option>
                {branchesForCity.map((b) => (
                  <option key={b.id} value={b.id}>
                    {branchOptionLabel(b, cityNameById(cities, b.cityId))}
                  </option>
                ))}
              </select>
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

      {filtersReady ? (
        <div className="flex items-stretch gap-3 overflow-x-auto overscroll-x-contain pb-1 pt-0.5 snap-x snap-mandatory scroll-smooth [-webkit-overflow-scrolling:touch]">
          {filteredInstructors.map((ins) => (
            <div
              key={ins.id}
              className="snap-start shrink-0 w-[min(17.5rem,calc(100vw-4rem))] sm:w-72 flex flex-col self-stretch min-h-0"
            >
              <InstructorCard
                instructor={ins}
                requestMode
                compact
                onRequest={() => openRequestFor(ins)}
                requestDisabled={!selectedBranchId}
              />
            </div>
          ))}
        </div>
      ) : (
        <Card className="p-6 border-border text-sm text-muted-foreground">{t("bookingNoInstructorsByFilter")}</Card>
      )}

      <TheoryPersonalRequestModal
        open={requestModalOpen}
        onOpenChange={setRequestModalOpen}
        instructor={requestInstructor}
        branchId={selectedBranchId}
        selectedThemes={themes}
        onSubmitted={() => {
          setRequestInstructor(null);
        }}
      />
    </>
  );
}
