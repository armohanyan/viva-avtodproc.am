import AdminLayout from "src/components/AdminLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { DirectorButton, DirectorField, DirectorInput, DirectorStatCard, DirectorStatGrid } from "src/modules/director/components/DirectorUi";
import {
  DirectorChartPanel,
  DirectorDoughnutChart,
  DirectorLineChart,
  DirectorRankChart,
  DirectorReportGrid,
  DirectorReportSection,
  DirectorTrendChart,
} from "src/modules/director/components/DirectorCharts";
import { useAdminBranchFilterSnapshot } from "src/modules/admin/AdminBranchFilterProvider";
import { adminReportsQuery, fetchAdminReportsBundle } from "src/modules/admin/reports/adminReports.api";
import { downloadAdminReportsPdf } from "src/modules/admin/reports/adminReportsPdf";
import type { AdminReportsBundle } from "src/modules/admin/reports/adminReports.types";
import {
  aggregateBookingsByMonth,
  aggregateStudentsByBranch,
  bookingTypeLabel,
} from "src/modules/admin/reports/adminReports.types";
import { branchNameById, useBranches } from "src/modules/branches";
import { formatAmd } from "src/pages/admin/finance/adminFinanceShared";
import { getApiErrorMessage } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { yerevanMonthRangeContaining, yerevanTodayIso } from "src/lib/yerevanLessonCalendar";
import { useLang } from "src/lib/i18n";
import { useAccount } from "src/modules/accounts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileDown, RefreshCw, BarChart3 } from "lucide-react";

const EMPTY: AdminReportsBundle = {
  financial: {
    meta: { startDate: "", endDate: "", branchId: null, branchName: null, generatedAtIso: "" },
    summary: {
      totalIncomeAmd: 0,
      totalPaidAmountAmd: 0,
      totalPartialPaymentsAmd: 0,
      totalUnpaidDebtAmd: 0,
      newStudentsCount: 0,
      bookingsCreatedCount: 0,
      paidBookingsCount: 0,
      partialBookingsCount: 0,
      unpaidBookingsCount: 0,
      refundsCount: 0,
      totalRefundAmountAmd: 0,
      netRevenueAmd: 0,
      completedLessonsCount: 0,
      cancelledLessonsCount: 0,
      pendingUpcomingBookingsCount: 0,
    },
    bookings: [],
    newStudents: [],
    refunds: [],
    instructorLessons: [],
    optional: null,
  },
  leads: { contactRequests: 0, bookedCalls: 0 },
};

export default function AdminReportsPage() {
  const { t } = useLang();
  const { showToast } = useToast();
  const { branches } = useBranches();
  const { branchId, revision: branchFilterRevision } = useAdminBranchFilterSnapshot();
  const { user } = useAccount();
  const isSuperAdmin = user?.accountType === "super_admin";

  const monthDefault = useMemo(() => yerevanMonthRangeContaining(yerevanTodayIso()), []);
  const [start, setStart] = useState(monthDefault.start);
  const [end, setEnd] = useState(monthDefault.end);
  const [data, setData] = useState<AdminReportsBundle>(EMPTY);
  const [loading, setLoading] = useState(false);

  const query = useMemo(() => adminReportsQuery(start, end, branchId), [start, end, branchId]);

  const branchLabel = useMemo(() => {
    if (!branchId) return t("adminBranchFilterAll");
    return branchNameById(branches, branchId) ?? branchId;
  }, [branchId, branches, t]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminReportsBundle(query, start, end, isSuperAdmin);
      setData(res);
    } catch (e) {
      setData(EMPTY);
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [query, start, end, isSuperAdmin, showToast]);

  useEffect(() => {
    void load();
  }, [load, branchFilterRevision]);

  const { financial } = data;
  const { summary, optional } = financial;

  const bookingsByMonth = useMemo(
    () => aggregateBookingsByMonth(financial.bookings),
    [financial.bookings],
  );
  const studentsByBranch = useMemo(
    () => aggregateStudentsByBranch(financial.newStudents),
    [financial.newStudents],
  );
  const bookingTypes = useMemo(
    () =>
      (optional?.topBookingTypes ?? []).map((t) => ({
        label: bookingTypeLabel(t.type),
        value: t.count,
      })),
    [optional?.topBookingTypes],
  );
  const instructorRank = useMemo(
    () =>
      financial.instructorLessons
        .map((r) => ({ label: r.instructorName, value: r.totalHours }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
    [financial.instructorLessons],
  );
  const paymentSplit = useMemo(
    () =>
      optional
        ? [
            { label: "Օնլայն", value: optional.paymentsOnlineAmd },
            { label: "Ձեռքով / կանխիկ", value: optional.paymentsManualAmd },
          ].filter((p) => p.value > 0)
        : [],
    [optional],
  );

  const directorTrend = useMemo(() => {
    if (!data.monthlyTrend) return [];
    const { labels, revenue, netProfit } = data.monthlyTrend;
    return [
      {
        label: "Հասույթ",
        points: labels.map((label, i) => ({ label, value: revenue[i] ?? 0 })),
        colorIndex: 0,
      },
      {
        label: "Մաքուր շահույթ",
        points: labels.map((label, i) => ({ label, value: netProfit[i] ?? 0 })),
        colorIndex: 2,
      },
    ];
  }, [data.monthlyTrend]);

  const branchComparison = useMemo(
    () =>
      (optional?.branchComparison ?? []).map((b) => ({
        label: b.branchName,
        value: b.incomeAmd,
      })),
    [optional?.branchComparison],
  );

  const setCurrentMonth = () => {
    const range = yerevanMonthRangeContaining(yerevanTodayIso());
    setStart(range.start);
    setEnd(range.end);
  };

  return (
    <AdminLayout>
      <PanelPageHeader icon={BarChart3} title={t("adminReports")} />

      <div className="flex flex-wrap gap-4 items-end mb-6">
        <DirectorField label="Սկիզբ">
          <DirectorInput type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-auto" />
        </DirectorField>
        <DirectorField label="Վերջ">
          <DirectorInput type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="w-auto" />
        </DirectorField>
        <DirectorButton variant="outline" onClick={setCurrentMonth}>
          Ընթ. ամիս
        </DirectorButton>
        <DirectorButton onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Թարմացնել
        </DirectorButton>
        <DirectorButton
          variant="outline"
          onClick={() => downloadAdminReportsPdf(data, branchLabel)}
          disabled={loading || !financial.meta.startDate}
        >
          <FileDown className="w-4 h-4 mr-2" />
          PDF ներբեռնել
        </DirectorButton>
      </div>

      <DirectorStatGrid>
        <DirectorStatCard label="Եկամուտ" value={formatAmd(summary.totalIncomeAmd)} />
        <DirectorStatCard label="Զուտ եկամուտ" value={formatAmd(summary.netRevenueAmd)} />
        <DirectorStatCard label="Նոր գրանցումներ" value={summary.bookingsCreatedCount} />
        <DirectorStatCard label="Նոր ուսանողներ" value={summary.newStudentsCount} />
        <DirectorStatCard label="Ավարտված դասեր" value={summary.completedLessonsCount} />
        <DirectorStatCard label="Պարտք" value={formatAmd(summary.totalUnpaidDebtAmd)} />
        {optional ? (
          <DirectorStatCard label="Ծախսեր" value={formatAmd(optional.expensesTotalAmd)} />
        ) : null}
        {optional ? (
          <DirectorStatCard label="Զուտ շահույթ" value={formatAmd(optional.netProfitAmd)} />
        ) : null}
      </DirectorStatGrid>

      <div className="mt-8 space-y-8">
        <DirectorReportSection title={`Ֆինանսական · ${formatAmd(summary.netRevenueAmd)}`}>
          <DirectorReportGrid>
            <DirectorChartPanel title="Վճարման աղբյուր" subtitle="Օնլայն vs ձեռքով">
              <DirectorDoughnutChart points={paymentSplit} />
            </DirectorChartPanel>
            <DirectorChartPanel title="Վճարումների կարգավիճակ">
              <DirectorDoughnutChart
                points={[
                  { label: "Վճարված", value: summary.paidBookingsCount },
                  { label: "Մասնակի", value: summary.partialBookingsCount },
                  { label: "Չվճարված", value: summary.unpaidBookingsCount },
                ].filter((p) => p.value > 0)}
              />
            </DirectorChartPanel>
            {branchComparison.length > 0 ? (
              <DirectorChartPanel title="Ըստ մասնաճյուղի (եկամուտ)" className="md:col-span-2">
                <DirectorRankChart points={branchComparison} />
              </DirectorChartPanel>
            ) : null}
          </DirectorReportGrid>
        </DirectorReportSection>

        <DirectorReportSection title={`Ուսանողներ · ${summary.newStudentsCount} նոր`}>
          <DirectorReportGrid>
            <DirectorChartPanel title="Նոր ուսանողներ ըստ մասնաճյուղի">
              <DirectorRankChart points={studentsByBranch} label="Քանակ" />
            </DirectorChartPanel>
            <DirectorChartPanel title="Փաթեթային վաճառք">
              <DirectorStatGrid>
                <DirectorStatCard label="Փաթեթներ" value={optional?.packageSalesCount ?? 0} />
                <DirectorStatCard label="Գումար" value={formatAmd(optional?.packageSalesAmountAmd ?? 0)} />
              </DirectorStatGrid>
            </DirectorChartPanel>
          </DirectorReportGrid>
        </DirectorReportSection>

        <DirectorReportSection title={`Գրանցումներ · ${summary.bookingsCreatedCount}`}>
          <DirectorReportGrid>
            <DirectorChartPanel title="Գրանցումներ ըստ ամիսների">
              <DirectorTrendChart points={bookingsByMonth} label="Գրանցում" />
            </DirectorChartPanel>
            <DirectorChartPanel title="Գրանցման տեսակներ">
              <DirectorDoughnutChart points={bookingTypes} />
            </DirectorChartPanel>
            <DirectorChartPanel title="Հրահանգիչներ (ժամ)" className="md:col-span-2">
              <DirectorRankChart points={instructorRank} label="Ժամ" />
            </DirectorChartPanel>
          </DirectorReportGrid>
        </DirectorReportSection>

        <DirectorReportSection title="Դիմումներ և վերադարձներ">
          <DirectorStatGrid>
            <DirectorStatCard label="Կոնտակտային հարցումներ" value={data.leads.contactRequests} />
            <DirectorStatCard label="Հետզանգեր" value={data.leads.bookedCalls} />
            <DirectorStatCard label="Վերադարձներ" value={summary.refundsCount} />
            <DirectorStatCard label="Վերադարձ (AMD)" value={formatAmd(summary.totalRefundAmountAmd)} />
          </DirectorStatGrid>
        </DirectorReportSection>

        {isSuperAdmin && data.director && data.monthlyTrend ? (
          <DirectorReportSection title={`Տնօրենի ամփոփ · ${formatAmd(data.director.netProfit)}`}>
            <DirectorReportGrid>
              <DirectorChartPanel title="Հասույթ և շահույթ" subtitle="Ըստ ամիսների" className="md:col-span-2" tall>
                <DirectorLineChart series={directorTrend} />
              </DirectorChartPanel>
              <DirectorChartPanel title="Ծախսերի կառուցվածք">
                <DirectorRankChart
                  points={[
                    { label: "Ծախսեր", value: data.director.totalExpense },
                    { label: "Վառելիք", value: data.director.fuel },
                    { label: "Աշխատավարձ", value: data.director.salaryTotal },
                  ].filter((p) => p.value > 0)}
                />
              </DirectorChartPanel>
            </DirectorReportGrid>
          </DirectorReportSection>
        ) : null}
      </div>
    </AdminLayout>
  );
}
