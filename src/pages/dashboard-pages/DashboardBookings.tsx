import DashboardLayout from "src/components/DashboardLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import LessonBookingCalendar from "src/components/LessonBookingCalendar";
import { useLang } from "src/lib/i18n";
import { CalendarClock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Reveal } from "src/lib/motion";
import { Card } from "src/components/ui/card";
import { instructors } from "src/data/instructors";
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

export default function DashboardBookings() {
  const { t } = useLang();
  const [lessonType, setLessonType] = useState<PracticalLessonType | "">("");
  const [region, setRegion] = useState<ArmeniaRegion | "">("");
  const [districts, setDistricts] = useState<YerevanDistrict[]>([]);
  const [instructor, setInstructor] = useState("");

  const selectedDistricts = useMemo(() => districts, [districts]);
  const validationErrors = validatePracticalBookingSelection({
    lessonType,
    region,
    districts: selectedDistricts,
  });

  const filteredInstructors = useMemo(
    () =>
      getFilteredInstructors(instructors, {
        lessonType,
        region,
        districts: selectedDistricts,
      }),
    [lessonType, region, selectedDistricts],
  );

  const instructorNames = filteredInstructors.map((item) => item.name);

  const readyForCalendar = validationErrors.length === 0 && instructorNames.length > 0;

  useEffect(() => {
    if (!instructorNames.includes(instructor)) {
      setInstructor(instructorNames[0] ?? "");
    }
  }, [instructor, instructorNames]);

  return (
    <DashboardLayout>
      <Reveal>
        <PanelPageHeader icon={CalendarClock} title={t("bookingTitle")} subtitle={t("dashboardBookingsPageSubtitle")} />
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
      </Card>

      {readyForCalendar ? (
        <LessonBookingCalendar
          mode="student"
          instructorNames={instructorNames}
          selectedInstructor={instructor}
          onInstructorChange={setInstructor}
        />
      ) : (
        <Card className="p-6 border-border text-sm text-muted-foreground">{t("bookingNoInstructorsByFilter")}</Card>
      )}
    </DashboardLayout>
  );
}
