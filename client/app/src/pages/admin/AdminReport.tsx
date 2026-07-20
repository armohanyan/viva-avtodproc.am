import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Card } from "src/components/ui/card";
import { Input } from "src/components/ui/input";
import {
	formatDateTimeArmenian,
	formatNumericDateRange,
	formatShortDateFromIso,
	todayIsoDate,
} from "src/lib/adminFormat";
import { translateAm, useLang, type TranslationKey } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { cn } from "src/lib/utils";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useOptionalAdminBranchFilterRevision } from "src/modules/admin/AdminBranchFilterProvider";
import { getAdminBranchFilterId } from "src/modules/admin/adminBranchFilter";
import {
	BOOKING_LIST_PAYMENT_BADGE_CLASS,
	bookingListPaymentLabelKey,
} from "src/modules/admin/booking/adminBookingPayment";
import {
	buildFinancialReportPrintHtml,
	printFinancialReportDocument,
	type FinancialReportPrintLabels,
	type FinancialReportPrintSummary,
	type FinancialReportPrintTable,
} from "src/modules/admin/reports/printFinancialReport";
import { branchNameById, useBranches } from "src/modules/branches";
import { formatAmd } from "src/pages/admin/finance/adminFinanceShared";
import { Loader2, Printer, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

type ReportSummary = {
	totalIncomeAmd: number;
	totalPaidAmountAmd: number;
	totalPartialPaymentsAmd: number;
	totalUnpaidDebtAmd: number;
	newStudentsCount: number;
	bookingsCreatedCount: number;
	paidBookingsCount: number;
	partialBookingsCount: number;
	unpaidBookingsCount: number;
	refundsCount: number;
	totalRefundAmountAmd: number;
	netRevenueAmd: number;
	completedLessonsCount: number;
	cancelledLessonsCount: number;
	pendingUpcomingBookingsCount: number;
};

type ReportPayload = {
	meta: {
		startDate: string;
		endDate: string;
		branchId: number | null;
		branchName: string | null;
		generatedAtIso: string;
	};
	summary: ReportSummary;
	bookings: Array<{
		id: number;
		createdAtIso: string;
		lessonDateIso: string;
		studentName: string;
		bookingType: string;
		instructorName: string;
		branchName: string;
		totalPriceAmd: number;
		paidAmountAmd: number;
		remainingAmd: number;
		paymentStatus: string;
		bookingStatus: string;
		createdByLabel: string | null;
	}>;
	newStudents: Array<{
		id: number;
		name: string;
		phone: string;
		phone2: string;
		registrationDateIso: string;
		branchName: string;
		sourceLabel: string | null;
	}>;
	refunds: Array<{
		id: number;
		dateIso: string;
		studentName: string;
		serviceLabel: string;
		refundAmountAmd: number;
		reason: string | null;
		processedByLabel: string | null;
	}>;
	instructorLessons: Array<{
		instructorName: string;
		branchName: string;
		practicalCount: number;
		theoryGroupCount: number;
		theoryPersonalCount: number;
		completedCount: number;
		cancelledCount: number;
		totalHours: number;
	}>;
	optional: {
		expensesTotalAmd: number;
		expensesCount: number;
		netProfitAmd: number;
		packageSalesCount: number;
		packageSalesAmountAmd: number;
		paymentsOnlineAmd: number;
		paymentsManualAmd: number;
		topBookingTypes: Array<{ type: string; count: number }>;
		branchComparison: Array<{
			branchId: number;
			branchName: string;
			incomeAmd: number;
			bookingsCount: number;
			newStudentsCount: number;
		}>;
	} | null;
};

const BOOKING_TYPE_KEYS: Record<string, TranslationKey> = {
	single: "adminReportBookingTypeSingle",
	package: "adminReportBookingTypePackage",
	group: "adminReportBookingTypeGroup",
	personal_theory: "adminReportBookingTypePersonalTheory",
};

function paymentLabelKey(status: string): TranslationKey {
	const s = status as "paid" | "partial" | "unpaid" | "pending" | "failed";
	if (s === "paid" || s === "partial" || s === "unpaid" || s === "pending" || s === "failed") {
		return bookingListPaymentLabelKey(s);
	}
	return "adminBookingPaymentStatusUnpaid";
}

const OUTSTANDING_PAYMENT_STATUSES = new Set(["partial", "unpaid", "pending"]);

function isOutstandingBooking(booking: ReportPayload["bookings"][number]): boolean {
	return booking.remainingAmd > 0 || OUTSTANDING_PAYMENT_STATUSES.has(booking.paymentStatus);
}

type SummaryKpi = { key: TranslationKey; value: string };

function buildReportKpiSections(data: ReportPayload): {
	revenue: SummaryKpi[];
	activity: SummaryKpi[];
	finance: SummaryKpi[] | null;
} {
	const s = data.summary;
	const opt = data.optional;
	return {
		revenue: [
			{ key: "adminReportKpiNetRevenue", value: formatAmd(s.netRevenueAmd) },
			{ key: "adminReportKpiTotalPaid", value: formatAmd(s.totalPaidAmountAmd) },
			{ key: "adminReportKpiUnpaidDebt", value: formatAmd(s.totalUnpaidDebtAmd) },
			{
				key: "adminReportKpiRefunds",
				value: `${s.refundsCount} · ${formatAmd(s.totalRefundAmountAmd)}`,
			},
		],
		activity: [
			{ key: "adminReportKpiNewStudents", value: String(s.newStudentsCount) },
			{ key: "adminReportKpiBookingsCreated", value: String(s.bookingsCreatedCount) },
			{ key: "adminReportKpiCompletedLessons", value: String(s.completedLessonsCount) },
		],
		finance: opt
			? [
					{ key: "adminReportKpiExpenses", value: formatAmd(opt.expensesTotalAmd) },
					{ key: "adminReportKpiNetProfit", value: formatAmd(opt.netProfitAmd) },
					{ key: "adminReportKpiOnlinePayments", value: formatAmd(opt.paymentsOnlineAmd) },
					{ key: "adminReportKpiManualPayments", value: formatAmd(opt.paymentsManualAmd) },
				]
			: null,
	};
}

function KpiSection({ title, items, t }: { title: string; items: SummaryKpi[]; t: (k: TranslationKey) => string }) {
	return (
		<section>
			<h2 className="text-sm font-semibold mb-3">{title}</h2>
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
				{items.map((c) => (
					<KpiCard key={c.key} label={t(c.key)} value={c.value} />
				))}
			</div>
		</section>
	);
}

function KpiCard({ label, value, className }: { label: string; value: string; className?: string }) {
	return (
		<Card className={cn("p-4 flex flex-col gap-1 min-w-0", className)}>
			<p className="text-xs text-muted-foreground leading-snug">{label}</p>
			<p className="text-lg font-semibold tabular-nums break-words">{value}</p>
		</Card>
	);
}

export default function AdminReport() {
	const { t, lang } = useLang();
	const { showToast } = useToast();
	const { branches } = useBranches();
	const branchFilterRevision = useOptionalAdminBranchFilterRevision();
	const today = todayIsoDate();
	const [startDate, setStartDate] = useState(today);
	const [endDate, setEndDate] = useState(today);
	const [data, setData] = useState<ReportPayload | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const branchLabel = useMemo(() => {
		if (data?.meta.branchName) return data.meta.branchName;
		const id = getAdminBranchFilterId();
		if (id) return branchNameById(branches, id) ?? id;
		return t("adminReportAllBranches");
	}, [data?.meta.branchName, branches, t]);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const q = new URLSearchParams({ startDate, endDate });
			const res = await vivaApiJson<ReportPayload>(`/admin/reports/financial?${q}`);
			setData(res);
		} catch (e) {
			setData(null);
			setError(getApiErrorMessage(e));
		} finally {
			setLoading(false);
		}
	}, [startDate, endDate, branchFilterRevision]);

	useEffect(() => {
		void load();
	}, [load]);

	const periodLabel = useMemo(
		() =>
			startDate === endDate
				? formatShortDateFromIso(startDate, lang)
				: formatNumericDateRange(startDate, endDate, lang),
		[startDate, endDate, lang],
	);

	const kpiSections = useMemo(() => (data ? buildReportKpiSections(data) : null), [data]);

	const outstandingBookings = useMemo(
		() => (data?.bookings ?? []).filter(isOutstandingBooking),
		[data?.bookings],
	);

	const printSummaryCards = useMemo(() => {
		if (!kpiSections) return [];
		return [...kpiSections.revenue, ...kpiSections.activity, ...(kpiSections.finance ?? [])];
	}, [kpiSections]);

	const handlePrint = useCallback(() => {
		if (!data) return;
		const labels: FinancialReportPrintLabels = {
			documentTitle:
				startDate === endDate ? t("adminReportPrintTitleDay") : t("adminReportPrintTitle"),
			schoolName: translateAm("brandName"),
			labelPeriod: t("adminReportPrintPeriod"),
			periodValue: periodLabel,
			labelBranch: t("adminReportPrintBranch"),
			branchValue: branchLabel,
			labelGenerated: t("adminReportPrintGenerated"),
			generatedValue: formatDateTimeArmenian(new Date(data.meta.generatedAtIso), lang),
			sectionSummary: t("adminReportSectionSummary"),
		};
		const summary: FinancialReportPrintSummary[] = printSummaryCards.map((c) => ({
			label: t(c.key),
			value: c.value,
		}));
		const tables: FinancialReportPrintTable[] = [
			{
				title: t("adminReportSectionBookings"),
				headers: [
					t("adminReportColDate"),
					t("adminReportColStudent"),
					t("adminReportColBookingType"),
					t("adminReportColBranch"),
					t("adminReportColTotal"),
					t("adminReportColPaid"),
					t("adminReportColRemaining"),
					t("adminReportColPaymentStatus"),
				],
				rows: outstandingBookings.map((b) => [
					formatShortDateFromIso(b.lessonDateIso, lang),
					b.studentName,
					t(BOOKING_TYPE_KEYS[b.bookingType] ?? "adminReportBookingTypeSingle"),
					b.branchName,
					formatAmd(b.totalPriceAmd),
					formatAmd(b.paidAmountAmd),
					formatAmd(b.remainingAmd),
					t(paymentLabelKey(b.paymentStatus)),
				]),
			},
			{
				title: t("adminReportSectionRefunds"),
				headers: [
					t("adminReportColDate"),
					t("adminReportColStudent"),
					t("adminReportColService"),
					t("adminReportColRefundAmount"),
					t("adminReportColReason"),
					t("adminReportColProcessedBy"),
				],
				rows: data.refunds.map((r) => [
					formatShortDateFromIso(r.dateIso, lang),
					r.studentName,
					r.serviceLabel,
					formatAmd(r.refundAmountAmd),
					r.reason ?? "—",
					r.processedByLabel ?? "—",
				]),
			},
		];
		const html = buildFinancialReportPrintHtml(labels, summary, tables, lang);
		if (!printFinancialReportDocument(html)) {
			showToast(t("adminClassSchedulePrintBlocked"), "error");
		}
	}, [data, startDate, endDate, lang, t, periodLabel, branchLabel, printSummaryCards, outstandingBookings, showToast]);

	return (
		<AdminLayout>
			<div className="admin-report-page space-y-6 print:space-y-4">
				<PanelPageHeader
					title={t("adminReportTitle")}
					subtitle={t("adminReportSubtitle")}
					actions={
						<div className="flex flex-wrap gap-2 print:hidden">
							<Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
								<RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
								{t("adminReportRetry")}
							</Button>
							<Button type="button" variant="outline" size="sm" onClick={handlePrint} disabled={!data || loading}>
								<Printer className="h-4 w-4 mr-1" />
								{t("adminReportPrint")}
							</Button>
						</div>
					}
				/>

				<Card className="p-4 print:hidden">
					<div className="flex flex-wrap items-end gap-4">
						<label className="flex flex-col gap-1 text-sm">
							<span className="text-muted-foreground">{t("adminReportStartDate")}</span>
							<Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
						</label>
						<label className="flex flex-col gap-1 text-sm">
							<span className="text-muted-foreground">{t("adminReportEndDate")}</span>
							<Input
								type="date"
								value={endDate}
								min={startDate}
								onChange={(e) => setEndDate(e.target.value)}
							/>
						</label>
						<p className="text-sm text-muted-foreground pb-2">
							{t("adminReportBranchHint")}: <strong>{branchLabel}</strong>
						</p>
					</div>
				</Card>

				{loading && (
					<div className="flex items-center justify-center gap-2 py-16 text-muted-foreground print:hidden">
						<Loader2 className="h-6 w-6 animate-spin" />
						<span>{t("loading")}</span>
					</div>
				)}

				{!loading && error && (
					<Card className="p-6 text-center text-destructive print:hidden">
						<p>{error}</p>
						<Button type="button" variant="outline" className="mt-4" onClick={() => void load()}>
							{t("adminReportRetry")}
						</Button>
					</Card>
				)}

				{!loading && !error && data && (
					<>
						<div className="print-only-report-header hidden print:block mb-4">
							<h1 className="text-xl font-bold text-center">{t("adminReportPrintTitle")}</h1>
							<p className="text-center text-sm">
								{periodLabel} · {branchLabel}
							</p>
							<p className="text-center text-xs text-muted-foreground">
								{formatDateTimeArmenian(new Date(data.meta.generatedAtIso), lang)}
							</p>
						</div>

						{kpiSections && (
							<div className="space-y-6">
								<KpiSection title={t("adminReportSectionRevenue")} items={kpiSections.revenue} t={t} />
								<KpiSection title={t("adminReportSectionActivity")} items={kpiSections.activity} t={t} />
								{kpiSections.finance && (
									<KpiSection title={t("adminReportSectionFinance")} items={kpiSections.finance} t={t} />
								)}
							</div>
						)}

						{data.optional && data.optional.branchComparison.length > 0 && (
							<section className="print:break-inside-avoid">
								<h2 className="text-sm font-semibold mb-3">{t("adminReportColBranch")}</h2>
								<Card className="p-0 overflow-hidden">
									<AdminTableScroll>
										<table className="w-full text-sm">
											<thead>
												<tr className="border-b bg-muted/40">
													<th className="text-left p-2">{t("adminReportColBranch")}</th>
													<th className="text-right p-2">{t("adminReportKpiTotalIncome")}</th>
													<th className="text-right p-2">{t("adminReportKpiBookingsCreated")}</th>
													<th className="text-right p-2">{t("adminReportKpiNewStudents")}</th>
												</tr>
											</thead>
											<tbody>
												{data.optional.branchComparison.map((row) => (
													<tr key={row.branchId} className="border-b">
														<td className="p-2">{row.branchName}</td>
														<td className="p-2 text-right tabular-nums">{formatAmd(row.incomeAmd)}</td>
														<td className="p-2 text-right">{row.bookingsCount}</td>
														<td className="p-2 text-right">{row.newStudentsCount}</td>
													</tr>
												))}
											</tbody>
										</table>
									</AdminTableScroll>
								</Card>
							</section>
						)}

						<ReportTableSection
							title={t("adminReportSectionBookings")}
							empty={t("adminReportEmptyBookings")}
							isEmpty={outstandingBookings.length === 0}
						>
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b bg-muted/40">
										<th className="text-left p-2 whitespace-nowrap">{t("adminReportColDate")}</th>
										<th className="text-left p-2">{t("adminReportColStudent")}</th>
										<th className="text-left p-2">{t("adminReportColBookingType")}</th>
										<th className="text-left p-2">{t("adminReportColBranch")}</th>
										<th className="text-right p-2">{t("adminReportColTotal")}</th>
										<th className="text-right p-2">{t("adminReportColPaid")}</th>
										<th className="text-right p-2">{t("adminReportColRemaining")}</th>
										<th className="text-left p-2">{t("adminReportColPaymentStatus")}</th>
									</tr>
								</thead>
								<tbody>
									{outstandingBookings.map((b) => (
										<tr key={b.id} className="border-b hover:bg-muted/20">
											<td className="p-2 whitespace-nowrap">
												{formatShortDateFromIso(b.lessonDateIso, lang)}
											</td>
											<td className="p-2">{b.studentName}</td>
											<td className="p-2">
												{t(BOOKING_TYPE_KEYS[b.bookingType] ?? "adminReportBookingTypeSingle")}
											</td>
											<td className="p-2">{b.branchName}</td>
											<td className="p-2 text-right tabular-nums">{formatAmd(b.totalPriceAmd)}</td>
											<td className="p-2 text-right tabular-nums">{formatAmd(b.paidAmountAmd)}</td>
											<td className="p-2 text-right tabular-nums">{formatAmd(b.remainingAmd)}</td>
											<td className="p-2">
												<Badge className={BOOKING_LIST_PAYMENT_BADGE_CLASS[b.paymentStatus] ?? ""}>
													{t(paymentLabelKey(b.paymentStatus))}
												</Badge>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</ReportTableSection>

						<ReportTableSection
							title={t("adminReportSectionRefunds")}
							empty={t("adminReportEmptyRefunds")}
							isEmpty={data.refunds.length === 0}
						>
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b bg-muted/40">
										<th className="text-left p-2">{t("adminReportColDate")}</th>
										<th className="text-left p-2">{t("adminReportColStudent")}</th>
										<th className="text-left p-2">{t("adminReportColService")}</th>
										<th className="text-right p-2">{t("adminReportColRefundAmount")}</th>
										<th className="text-left p-2">{t("adminReportColReason")}</th>
										<th className="text-left p-2">{t("adminReportColProcessedBy")}</th>
									</tr>
								</thead>
								<tbody>
									{data.refunds.map((r) => (
										<tr key={r.id} className="border-b">
											<td className="p-2">{formatShortDateFromIso(r.dateIso, lang)}</td>
											<td className="p-2">{r.studentName}</td>
											<td className="p-2 max-w-[200px] truncate" title={r.serviceLabel}>
												{r.serviceLabel}
											</td>
											<td className="p-2 text-right tabular-nums">{formatAmd(r.refundAmountAmd)}</td>
											<td className="p-2 max-w-[160px] truncate" title={r.reason ?? ""}>
												{r.reason ?? "—"}
											</td>
											<td className="p-2">{r.processedByLabel ?? "—"}</td>
										</tr>
									))}
								</tbody>
							</table>
						</ReportTableSection>
					</>
				)}
			</div>

			<style>{`
				@media print {
					body * { visibility: hidden; }
					.admin-report-page,
					.admin-report-page * { visibility: visible; }
					.admin-report-page {
						position: absolute;
						left: 0;
						top: 0;
						width: 100%;
						padding: 0;
					}
					.print\\:hidden { display: none !important; }
					.print-only-report-header { display: block !important; }
					aside, nav, header[data-admin-shell], .admin-branch-filter { display: none !important; }
					table { font-size: 8pt; }
					.print\\:break-inside-avoid { break-inside: avoid; }
				}
			`}</style>
		</AdminLayout>
	);
}

function ReportTableSection({
	title,
	empty,
	isEmpty,
	children,
}: {
	title: string;
	empty: string;
	isEmpty: boolean;
	children: ReactNode;
}) {
	return (
		<section className="print:break-inside-avoid">
			<h2 className="text-sm font-semibold mb-3">{title}</h2>
			<Card className="p-0 overflow-hidden">
				{isEmpty ? (
					<p className="p-6 text-sm text-muted-foreground text-center">{empty}</p>
				) : (
					<AdminTableScroll>{children}</AdminTableScroll>
				)}
			</Card>
		</section>
	);
}
