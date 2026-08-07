import InstructorPanelLayout from "src/components/InstructorPanelLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import TableSkeletonRows from "src/components/TableSkeletonRows";
import { Button } from "src/components/ui/button";
import { Card } from "src/components/ui/card";
import { Input } from "src/components/ui/input";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { formatAmd } from "src/utils/currency.utils";
import { halfMonthPeriod, previousHalfMonthPeriod } from "src/utils/halfMonthPeriod.utils";
import { BarChart3 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { TranslationKey } from "src/lib/i18n";
import { useInstructorTeachingScope } from "src/modules/instructor/useInstructorTeachingScope";

type SalaryLessonRow = {
  id: number;
  dateIso: string;
  startTime: string;
  endTime: string | null;
  units: number;
  label: string;
};

type ReportSection = {
  lessonsCount: number;
  ratePerLessonAmd: number;
  totalAmd: number;
  items: SalaryLessonRow[];
};

type InstructorSalaryReport = {
  startDate: string;
  endDate: string;
  practical: ReportSection;
  theory: ReportSection;
  totalAmd: number;
};

function LessonsTable({
  section,
  labelHeaderKey,
  loading,
}: {
  section: ReportSection | null;
  labelHeaderKey: TranslationKey;
  loading: boolean;
}) {
  const { t } = useLang();
  const items = section?.items ?? [];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            {[t("adminPetrolColDate"), t("adminSalaryColTime"), t(labelHeaderKey), t("adminSalaryColLessons")].map((h, i) => (
              <th
                key={i}
                className={`text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider whitespace-nowrap ${i === 3 ? "text-right" : "text-left"}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {loading ? (
            <TableSkeletonRows cols={4} cellClassName="px-4 py-3" />
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                {t("adminSalaryNoRows")}
              </td>
            </tr>
          ) : (
            items.map((row) => (
              <tr key={row.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 whitespace-nowrap tabular-nums">{row.dateIso}</td>
                <td className="px-4 py-3 whitespace-nowrap tabular-nums text-muted-foreground">
                  {row.startTime}
                  {row.endTime ? ` — ${row.endTime}` : ""}
                </td>
                <td className="px-4 py-3">{row.label}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.units}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function InstructorReports() {
  const { t } = useLang();
  const { showToast } = useToast();
  const { teachesPractical, teachesTheory } = useInstructorTeachingScope();

  const [period, setPeriod] = useState(() => halfMonthPeriod(new Date()));
  const [report, setReport] = useState<InstructorSalaryReport | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ startDate: period.start, endDate: period.end });
      const data = await vivaApiJson<InstructorSalaryReport>(`/instructor/salary-report?${params.toString()}`);
      setReport(data);
    } catch (e) {
      setReport(null);
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [period.start, period.end, showToast]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const periodChips: Array<{ id: string; label: string; range: { start: string; end: string } }> = [
    { id: "previous", label: t("adminSalaryPreviousPeriod"), range: previousHalfMonthPeriod(new Date()) },
    { id: "current", label: t("adminSalaryCurrentPeriod"), range: halfMonthPeriod(new Date()) },
  ];

  const showPractical = teachesPractical;
  const showTheory = teachesTheory;
  const kpiCols = showPractical && showTheory ? "sm:grid-cols-3" : "sm:grid-cols-2";

  return (
    <InstructorPanelLayout>
      <PanelPageHeader icon={BarChart3} title={t("instructorReportsTitle")} subtitle={t("instructorReportsSubtitle")} />

      <Card className="p-5 border-border mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminSalaryPeriodLabel")}</label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={period.start}
                onChange={(e) => setPeriod((p) => ({ ...p, start: e.target.value }))}
                className="h-10 w-40"
              />
              <span className="text-muted-foreground">—</span>
              <Input
                type="date"
                value={period.end}
                onChange={(e) => setPeriod((p) => ({ ...p, end: e.target.value }))}
                className="h-10 w-40"
              />
            </div>
          </div>
          <div className="flex gap-2">
            {periodChips.map((chip) => {
              const active = chip.range.start === period.start && chip.range.end === period.end;
              return (
                <Button
                  key={chip.id}
                  type="button"
                  variant={active ? "default" : "outline"}
                  className="h-10"
                  onClick={() => setPeriod(chip.range)}
                >
                  {chip.label}
                </Button>
              );
            })}
          </div>
        </div>
      </Card>

      <div className={`grid grid-cols-1 ${kpiCols} gap-4 mb-6`}>
        {showPractical ? (
          <Card className="p-5 border-border">
            <p className="text-xs text-muted-foreground mb-1">{t("instructorReportsPracticalTitle")}</p>
            <p className="text-lg font-bold tabular-nums">{loading ? "…" : report?.practical.lessonsCount ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1 tabular-nums">
              {formatAmd(report?.practical.ratePerLessonAmd ?? 1500)} × {report?.practical.lessonsCount ?? 0} ={" "}
              {formatAmd(report?.practical.totalAmd ?? 0)}
            </p>
          </Card>
        ) : null}
        {showTheory ? (
          <Card className="p-5 border-border">
            <p className="text-xs text-muted-foreground mb-1">{t("instructorReportsTheoryTitle")}</p>
            <p className="text-lg font-bold tabular-nums">{loading ? "…" : report?.theory.lessonsCount ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1 tabular-nums">
              {formatAmd(report?.theory.ratePerLessonAmd ?? 3000)} × {report?.theory.lessonsCount ?? 0} ={" "}
              {formatAmd(report?.theory.totalAmd ?? 0)}
            </p>
          </Card>
        ) : null}
        <Card className="p-5 border-border">
          <p className="text-xs text-muted-foreground mb-1">{t("instructorReportsTotalLabel")}</p>
          <p className="text-lg font-bold tabular-nums">{loading ? "…" : formatAmd(report?.totalAmd ?? 0)}</p>
          <p className="text-xs text-muted-foreground mt-1 tabular-nums">
            {period.start} — {period.end}
          </p>
        </Card>
      </div>

      {showPractical ? (
        <Card className="border-border overflow-hidden min-w-0 mb-6">
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold text-foreground">{t("instructorReportsPracticalTitle")}</h3>
          </div>
          <LessonsTable section={report?.practical ?? null} labelHeaderKey="adminSalaryColStudent" loading={loading} />
        </Card>
      ) : null}

      {showTheory ? (
        <Card className="border-border overflow-hidden min-w-0">
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold text-foreground">{t("instructorReportsTheoryTitle")}</h3>
          </div>
          <LessonsTable section={report?.theory ?? null} labelHeaderKey="adminSalaryColGroup" loading={loading} />
        </Card>
      ) : null}
    </InstructorPanelLayout>
  );
}
