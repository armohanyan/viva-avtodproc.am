import AdminTableScroll from "src/components/AdminTableScroll";
import { Button } from "src/components/ui/button";
import { Card } from "src/components/ui/card";
import { Input } from "src/components/ui/input";
import { useLang } from "src/lib/i18n";
import { yerevanTodayIso } from "src/lib/yerevanLessonCalendar";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { useOptionalAdminBranchFilterRevision } from "src/modules/admin/AdminBranchFilterProvider";
import type { PetrolFuelKmAnalyticsResponse } from "src/types/petrol-fuel-km-analytics.types";
import { formatShortDateFromIso } from "src/utils/locale.utils";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function AdminPetrolFuelKmAnalyticsSubTab() {
  const branchFilterRevision = useOptionalAdminBranchFilterRevision();
  const { t, lang } = useLang();
  const { showToast } = useToast();

  const todayIso = useMemo(() => yerevanTodayIso(), []);
  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(todayIso);
  const [items, setItems] = useState<PetrolFuelKmAnalyticsResponse["items"]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        startDate: startDate.slice(0, 10),
        endDate: endDate.slice(0, 10),
      });
      const res = await vivaApiJson<PetrolFuelKmAnalyticsResponse>(
        `/admin/petrol-fuel-km/analytics?${qs.toString()}`,
      );
      setItems(res.items);
    } catch (e) {
      setItems([]);
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, showToast]);

  useEffect(() => {
    void load();
  }, [load, branchFilterRevision]);

  return (
    <div className="space-y-6">
      <Card className="p-4 border-border space-y-4">
        <h3 className="text-lg font-semibold text-primary">{t("adminPetrolFuelKmSubTabAnalytics")}</h3>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">{t("adminPetrolFilterFrom")}</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 w-[11rem]"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">{t("adminPetrolFilterTo")}</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 w-[11rem]"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={() => {
              setStartDate(todayIso);
              setEndDate(todayIso);
            }}
          >
            {t("adminPetrolFilterToday")}
          </Button>
        </div>

        <AdminTableScroll>
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-3 py-2">{t("adminPetrolColDate")}</th>
                <th className="px-3 py-2">{t("adminPetrolColInstructor")}</th>
                <th className="px-3 py-2 text-right">{t("adminPetrolFuelKmAnalyticsLessons")}</th>
                <th className="px-3 py-2 text-right">{t("adminPetrolFuelKmColKm")}</th>
                <th className="px-3 py-2">{t("adminPetrolFuelKmAnalyticsPetrolRegistered")}</th>
                <th className="px-3 py-2 text-right">{t("adminPetrolFuelKmAnalyticsAvgKm")}</th>
                <th className="px-3 py-2 text-right">{t("adminPetrolFuelKmAnalyticsAvgBenzin")}</th>
                <th className="px-3 py-2 text-right">{t("adminPetrolFuelKmAnalyticsAvgLpg")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                    {t("loading")}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                    {t("adminPetrolFuelKmAnalyticsEmpty")}
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr
                    key={`${row.date}-${row.instructorUserId}`}
                    className="border-b hover:bg-muted/30"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatShortDateFromIso(row.date, lang)}
                    </td>
                    <td className="px-3 py-2">{row.instructorName}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.lessonCount}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.totalKm}</td>
                    <td className="px-3 py-2">
                      {row.hasPetrolExpense
                        ? t("adminClassSchedulePrintLessonHeldYes")
                        : t("adminClassSchedulePrintLessonHeldNo")}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.avgKmPerLesson}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.avgBenzinPerLesson}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.avgLpgPerLesson}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </AdminTableScroll>
      </Card>
    </div>
  );
}
