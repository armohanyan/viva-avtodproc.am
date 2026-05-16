import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import { AppModal } from "src/components/AppModal";
import DataTableToolbar from "src/components/DataTableToolbar";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Card } from "src/components/ui/card";
import { Input } from "src/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "src/components/ui/tabs";
import { BOOKING_STATUS_BADGE_CLASS } from "src/constants/booking.constants";
import {
	formatArmenianDateRange,
	formatDateTimeArmenian,
	formatShortDateArmenian,
	formatShortDateFromIso,
	localeForLang,
} from "src/lib/adminFormat";
import { translateAm, useLang, type TranslationKey } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { cn } from "src/lib/utils";
import {
	buildClassSchedulePrintHtml,
	printClassScheduleDocument,
	type ClassSchedulePrintRow,
} from "src/modules/admin/classSchedule/printClassSchedule";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useOptionalAdminBranchFilterRevision } from "src/modules/admin/AdminBranchFilterProvider";
import { useInstructors } from "src/modules/instructors/useInstructors";
import {
	yerevanAddCalendarDays,
	yerevanMonthRangeContaining,
	yerevanTodayIso,
	yerevanWeekRangeContaining,
} from "src/lib/yerevanLessonCalendar";
import { toCanonicalBookingStatus } from "src/utils/booking.utils";
import {
	CalendarDays,
	ChevronLeft,
	ChevronRight,
	ExternalLink,
	Loader2,
	Printer,
	RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

type ScheduleView = "today" | "week" | "month" | "custom";

type ClassScheduleItem = {
	id: string;
	bookingId: number;
	lessonType: "practical" | "theory" | "theory_personal";
	bookingType: "single" | "package" | "group" | "personal_theory";
	status: string;
	date: string;
	startTime: string;
	endTime: string;
	student: { id: number; name: string; phone: string | null };
	instructor: { id: number | null; name: string };
	branch: { id: number; name: string; address: string };
	package: { id: number; name: string; isIncludedLesson: boolean } | null;
	payment: { status: "paid" | "free" | "pending" | "not_required" };
	notes: string;
	cancellationRequestedAt: string | null;
	lessonPassedSuccessfully: boolean | null;
	totalPriceAmd: number | null;
};

type ClassScheduleResponse = {
	items: ClassScheduleItem[];
	meta: { view: ScheduleView; startDate: string; endDate: string; total: number };
};

type StudentMini = { id: string; name: string };

const LESSON_TYPE_COLORS: Record<string, string> = {
	practical: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
	theory: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-200",
	theory_personal: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
};

function pad2(n: number): string {
	return String(n).padStart(2, "0");
}

function displayTime(t: string): string {
	return t.length >= 5 ? t.slice(0, 5) : t;
}

function lessonTypeKey(type: ClassScheduleItem["lessonType"]): TranslationKey {
	if (type === "theory") return "lessonTypeTheory";
	if (type === "theory_personal") return "lessonTypeTheoryPersonal";
	return "lessonTypePractical";
}

function bookingTypeKey(type: ClassScheduleItem["bookingType"]): TranslationKey {
	if (type === "package") return "adminClassScheduleBookingTypePackage";
	if (type === "group") return "adminClassScheduleBookingTypeGroup";
	if (type === "personal_theory") return "adminClassScheduleBookingTypePersonalTheory";
	return "adminClassScheduleBookingTypeSingle";
}

function paymentKey(status: ClassScheduleItem["payment"]["status"]): TranslationKey {
	if (status === "paid") return "adminClassSchedulePaymentPaid";
	if (status === "free") return "adminClassSchedulePaymentFree";
	if (status === "pending") return "adminClassSchedulePaymentPending";
	return "adminClassSchedulePaymentNotRequired";
}

function formatLessonHeldForPrint(
	value: boolean | null,
	t: (k: TranslationKey) => string,
): string {
	if (value === true) return t("adminClassSchedulePrintLessonHeldYes");
	if (value === false) return t("adminClassSchedulePrintLessonHeldNo");
	return "";
}

function formatNotesForPrint(raw: string, t: (k: TranslationKey) => string): string {
	if (!raw.trim()) return "";
	return raw
		.split(" · ")
		.map((part) => {
			const p = part.trim();
			if (p === "cancellation_requested") return t("adminClassSchedulePrintNoteCancellationRequested");
			if (p === "lesson_passed") return t("lessonPassedPass");
			if (p === "lesson_not_passed") return t("lessonPassedFail");
			return p;
		})
		.filter(Boolean)
		.join("; ");
}

type MonthCell =
	| { key: string; type: "blank" }
	| { key: string; type: "day"; iso: string; day: number };

function buildMonthGridCells(year: number, month1To12: number): MonthCell[] {
	const dim = new Date(year, month1To12, 0).getDate();
	const firstJs = new Date(year, month1To12 - 1, 1).getDay();
	const leading = firstJs === 0 ? 6 : firstJs - 1;
	const cells: MonthCell[] = [];
	for (let i = 0; i < leading; i++) cells.push({ key: `b-${i}`, type: "blank" });
	for (let d = 1; d <= dim; d++) {
		const iso = `${year}-${pad2(month1To12)}-${pad2(d)}`;
		cells.push({ key: iso, type: "day", iso, day: d });
	}
	while (cells.length % 7 !== 0) cells.push({ key: `t-${cells.length}`, type: "blank" });
	while (cells.length < 42) cells.push({ key: `p-${cells.length}`, type: "blank" });
	return cells.slice(0, 42);
}

function weekDayShortHeaders(locale: string): string[] {
	const base = new Date(2024, 0, 1);
	const headers: string[] = [];
	for (let i = 0; i < 7; i++) {
		const d = new Date(base);
		d.setDate(base.getDate() + i);
		headers.push(d.toLocaleDateString(locale, { weekday: "short" }));
	}
	return headers;
}

function enumerateIsoDates(start: string, end: string): string[] {
	const out: string[] = [];
	let cur = start;
	while (cur <= end) {
		out.push(cur);
		cur = yerevanAddCalendarDays(cur, 1);
	}
	return out;
}

export default function AdminClassSchedule() {
	const branchFilterRevision = useOptionalAdminBranchFilterRevision();
	const { t, lang } = useLang();
	const { showToast } = useToast();
	const { instructors } = useInstructors();

	const [view, setView] = useState<ScheduleView>("today");
	const [customStart, setCustomStart] = useState(yerevanTodayIso());
	const [customEnd, setCustomEnd] = useState(yerevanTodayIso());
	const [anchorIso, setAnchorIso] = useState(yerevanTodayIso());

	const [lessonType, setLessonType] = useState("all");
	const [instructorId, setInstructorId] = useState("");
	const [studentId, setStudentId] = useState("");
	const [status, setStatus] = useState("all");
	const [packageFilter, setPackageFilter] = useState("all");
	const [search, setSearch] = useState("");

	const [students, setStudents] = useState<StudentMini[]>([]);
	const [data, setData] = useState<ClassScheduleResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [detail, setDetail] = useState<ClassScheduleItem | null>(null);

	const locale = localeForLang(lang);

	useEffect(() => {
		void vivaApiJson<StudentMini[]>("/students")
			.then((rows) => setStudents(Array.isArray(rows) ? rows : []))
			.catch(() => setStudents([]));
	}, [branchFilterRevision]);

	const queryString = useMemo(() => {
		const p = new URLSearchParams();
		p.set("view", view);
		if (view === "custom") {
			p.set("startDate", customStart);
			p.set("endDate", customEnd);
		} else if (view === "week") {
			const r = yerevanWeekRangeContaining(anchorIso);
			p.set("startDate", r.start);
			p.set("endDate", r.end);
		} else if (view === "month") {
			const r = yerevanMonthRangeContaining(anchorIso);
			p.set("startDate", r.start);
			p.set("endDate", r.end);
		}
		if (lessonType !== "all") p.set("lessonType", lessonType);
		if (instructorId) p.set("instructorId", instructorId);
		if (studentId) p.set("studentId", studentId);
		if (status !== "all") p.set("status", status);
		if (packageFilter !== "all") p.set("packageFilter", packageFilter);
		if (search.trim()) p.set("search", search.trim());
		return p.toString();
	}, [view, customStart, customEnd, anchorIso, lessonType, instructorId, studentId, status, packageFilter, search]);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await vivaApiJson<ClassScheduleResponse>(`/admin/class-schedule?${queryString}`);
			setData(res);
		} catch (e) {
			setError(getApiErrorMessage(e));
			setData(null);
		} finally {
			setLoading(false);
		}
	}, [queryString]);

	useEffect(() => {
		void load();
	}, [load, branchFilterRevision]);

	const items = data?.items ?? [];
	const meta = data?.meta;

	const itemsByDate = useMemo(() => {
		const map = new Map<string, ClassScheduleItem[]>();
		for (const item of items) {
			const list = map.get(item.date) ?? [];
			list.push(item);
			map.set(item.date, list);
		}
		for (const [, list] of map) {
			list.sort((a, b) => a.startTime.localeCompare(b.startTime));
		}
		return map;
	}, [items]);

	const weekRange = useMemo(() => yerevanWeekRangeContaining(anchorIso), [anchorIso]);
	const weekDates = useMemo(() => enumerateIsoDates(weekRange.start, weekRange.end), [weekRange]);
	const monthGrid = useMemo(() => {
		const [y, m] = anchorIso.slice(0, 10).split("-").map(Number);
		return buildMonthGridCells(y, m);
	}, [anchorIso]);

	const periodLabel = useMemo(() => {
		if (!meta) return "";
		if (meta.startDate === meta.endDate) return formatShortDateFromIso(meta.startDate, lang);
		return `${formatShortDateFromIso(meta.startDate, lang)} – ${formatShortDateFromIso(meta.endDate, lang)}`;
	}, [meta, lang]);

	const handleViewChange = (next: string) => {
		const v = next as ScheduleView;
		setView(v);
		if (v === "today") setAnchorIso(yerevanTodayIso());
	};

	const handlePrint = useCallback(() => {
		if (items.length === 0) return;

		const tAm = translateAm;
		const generatedAt = formatDateTimeArmenian(new Date());
		const printPeriod =
			meta != null ? formatArmenianDateRange(meta.startDate, meta.endDate) : periodLabel;

		const printRows: ClassSchedulePrintRow[] = items.map((item) => {
			const canon = toCanonicalBookingStatus(item.status);
			const packageNote =
				item.package?.isIncludedLesson && item.package.name
					? `${item.package.name}`
					: "";
			const notesCombined = [formatNotesForPrint(item.notes, tAm), packageNote].filter(Boolean).join("; ");

			return {
				date: item.date,
				dateLabel: formatShortDateArmenian(item.date),
				timeLabel: `${displayTime(item.startTime)} – ${displayTime(item.endTime)}`,
				studentName: item.student.name,
				studentPhone: item.student.phone ?? "",
				instructorName: item.instructor.name || "—",
				lessonTypeLabel: tAm(lessonTypeKey(item.lessonType)),
				branchName: item.branch.name,
				statusLabel: tAm(canon),
				paymentLabel: tAm(paymentKey(item.payment.status)),
				bookingTypeLabel: tAm(bookingTypeKey(item.bookingType)),
				lessonHeldLabel: formatLessonHeldForPrint(item.lessonPassedSuccessfully, tAm),
				notesLabel: notesCombined,
			};
		});

		const html = buildClassSchedulePrintHtml(
			{
				documentTitle: `${tAm("adminClassSchedule")} — ${printPeriod}`,
				heading: tAm("adminClassSchedule"),
				period: printPeriod,
				generatedLabel: tAm("adminClassSchedulePrintGeneratedAt"),
				totalLabel: tAm("adminClassSchedulePrintTotal"),
				colNo: tAm("adminClassSchedulePrintColNo"),
				colDate: tAm("adminClassScheduleColDate"),
				colTime: tAm("adminClassScheduleColTime"),
				colStudent: tAm("adminClassScheduleColStudent"),
				colPhone: tAm("phoneNumber"),
				colInstructor: tAm("adminClassScheduleColInstructor"),
				colLessonType: tAm("adminClassScheduleColType"),
				colBranch: tAm("adminClassScheduleColBranch"),
				colStatus: tAm("adminClassScheduleColStatus"),
				colPayment: tAm("adminClassScheduleColPayment"),
				colBookingType: tAm("adminClassScheduleColBookingType"),
				colLessonHeld: tAm("adminClassSchedulePrintLessonHeld"),
				colNotes: tAm("adminClassSchedulePrintNotesCol"),
			},
			printRows,
			items.length,
			generatedAt,
			"hy",
		);

		if (!printClassScheduleDocument(html)) {
			showToast(t("adminClassSchedulePrintBlocked"), "error");
		}
	}, [items, meta, periodLabel, showToast, t]);

	const renderLessonChip = (item: ClassScheduleItem, compact?: boolean) => (
			<button
				key={item.id}
				type="button"
				onClick={() => setDetail(item)}
				className={cn(
					"w-full text-left rounded-md border border-border/80 bg-card px-2 py-1.5 shadow-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
					compact && "text-[11px] leading-tight py-1",
				)}
			>
				<div className="font-medium text-foreground truncate">
					{displayTime(item.startTime)}–{displayTime(item.endTime)}
				</div>
				<div className="truncate text-muted-foreground">{item.student.name}</div>
				{!compact && item.instructor.name ? (
					<div className="truncate text-xs text-muted-foreground">{item.instructor.name}</div>
				) : null}
			</button>
	);

	return (
		<AdminLayout>
			<PanelPageHeader
				icon={CalendarDays}
				title={t("adminClassSchedule")}
				subtitle={t("adminClassSchedulePageSubtitle")}
			/>

			<Tabs value={view} onValueChange={handleViewChange} className="space-y-4">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<TabsList className="flex-wrap h-auto">
						<TabsTrigger value="today">{t("adminClassScheduleViewToday")}</TabsTrigger>
						<TabsTrigger value="week">{t("adminClassScheduleViewWeek")}</TabsTrigger>
						<TabsTrigger value="month">{t("adminClassScheduleViewMonth")}</TabsTrigger>
						<TabsTrigger value="custom">{t("adminClassScheduleViewCustom")}</TabsTrigger>
					</TabsList>
					{periodLabel ? (
						<p className="text-sm text-muted-foreground tabular-nums">{periodLabel}</p>
					) : null}
				</div>

				<Card className="p-4 space-y-3">
					<DataTableToolbar search={search} onSearchChange={setSearch} searchPlaceholder={t("search")}>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handlePrint}
							disabled={loading || items.length === 0}
							className="gap-1.5"
						>
							<Printer className="h-4 w-4 shrink-0" />
							{t("adminClassSchedulePrint")}
						</Button>
						<Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
							{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
							<span className="sr-only">{t("adminClassScheduleRetry")}</span>
						</Button>
					</DataTableToolbar>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
						<div>
							<label className="text-xs font-medium text-muted-foreground mb-1 block">
								{t("adminClassScheduleFiltersLessonType")}
							</label>
							<select
								value={lessonType}
								onChange={(e) => setLessonType(e.target.value)}
								className="w-full h-9 rounded-lg border border-input bg-background px-2 text-sm"
							>
								<option value="all">{t("adminBookingsFilterAllTypes")}</option>
								<option value="practical">{t("lessonTypePractical")}</option>
								<option value="theory">{t("lessonTypeTheory")}</option>
							</select>
						</div>
						<div>
							<label className="text-xs font-medium text-muted-foreground mb-1 block">
								{t("adminClassScheduleFiltersInstructor")}
							</label>
							<select
								value={instructorId}
								onChange={(e) => setInstructorId(e.target.value)}
								className="w-full h-9 rounded-lg border border-input bg-background px-2 text-sm"
							>
								<option value="">{t("accountsFilterAll")}</option>
								{instructors.map((ins) => (
									<option key={ins.id} value={String(ins.id)}>
										{ins.name}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="text-xs font-medium text-muted-foreground mb-1 block">
								{t("adminClassScheduleFiltersStudent")}
							</label>
							<select
								value={studentId}
								onChange={(e) => setStudentId(e.target.value)}
								className="w-full h-9 rounded-lg border border-input bg-background px-2 text-sm"
							>
								<option value="">{t("accountsFilterAll")}</option>
								{students.map((s) => (
									<option key={s.id} value={s.id}>
										{s.name}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="text-xs font-medium text-muted-foreground mb-1 block">
								{t("adminClassScheduleFiltersStatus")}
							</label>
							<select
								value={status}
								onChange={(e) => setStatus(e.target.value)}
								className="w-full h-9 rounded-lg border border-input bg-background px-2 text-sm"
							>
								<option value="all">{t("accountsFilterAll")}</option>
								<option value="confirmed">{t("confirmed")}</option>
								<option value="pending">{t("pending")}</option>
								<option value="cancelled">{t("cancelled")}</option>
								<option value="refunded">{t("refunded")}</option>
							</select>
						</div>
						<div>
							<label className="text-xs font-medium text-muted-foreground mb-1 block">
								{t("adminClassScheduleFiltersPackage")}
							</label>
							<select
								value={packageFilter}
								onChange={(e) => setPackageFilter(e.target.value)}
								className="w-full h-9 rounded-lg border border-input bg-background px-2 text-sm"
							>
								<option value="all">{t("adminClassScheduleFilterAllPackages")}</option>
								<option value="package">{t("adminClassScheduleFilterPackageOnly")}</option>
								<option value="paid">{t("adminClassScheduleFilterPaidOnly")}</option>
								<option value="free">{t("adminClassSchedulePaymentFree")}</option>
							</select>
						</div>
					</div>

					{view === "custom" ? (
						<div className="flex flex-wrap gap-3 items-end">
							<div>
								<label className="text-xs font-medium text-muted-foreground mb-1 block">
									{t("adminClassScheduleCustomStart")}
								</label>
								<Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-9 w-40" />
							</div>
							<div>
								<label className="text-xs font-medium text-muted-foreground mb-1 block">
									{t("adminClassScheduleCustomEnd")}
								</label>
								<Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-9 w-40" />
							</div>
						</div>
					) : null}
				</Card>

				{loading ? (
					<div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
						<Loader2 className="h-6 w-6 animate-spin" />
						<span>{t("loading")}</span>
					</div>
				) : error ? (
					<Card className="p-8 text-center space-y-3">
						<p className="text-destructive">{error}</p>
						<Button type="button" onClick={() => void load()}>
							{t("adminClassScheduleRetry")}
						</Button>
					</Card>
				) : items.length === 0 ? (
					<Card className="p-12 text-center text-muted-foreground">{t("adminClassScheduleEmpty")}</Card>
				) : (
					<>
						<TabsContent value="today" className="mt-0">
							<AdminTableScroll>
								<table className="w-full text-sm">
									<thead>
										<tr className="border-b text-left text-muted-foreground">
											<th className="py-2 pr-3 font-medium">{t("adminClassScheduleColTime")}</th>
											<th className="py-2 pr-3 font-medium">{t("adminClassScheduleColStudent")}</th>
											<th className="py-2 pr-3 font-medium">{t("adminClassScheduleColInstructor")}</th>
											<th className="py-2 pr-3 font-medium">{t("adminClassScheduleColType")}</th>
											<th className="py-2 pr-3 font-medium">{t("adminClassScheduleColBranch")}</th>
											<th className="py-2 pr-3 font-medium">{t("adminClassScheduleColStatus")}</th>
											<th className="py-2 font-medium">{t("adminClassScheduleColPayment")}</th>
										</tr>
									</thead>
									<tbody>
										{items.map((item) => {
											const canon = toCanonicalBookingStatus(item.status);
											return (
												<tr
													key={item.id}
													className="border-b border-border/60 hover:bg-muted/40 cursor-pointer"
													onClick={() => setDetail(item)}
												>
													<td className="py-2.5 pr-3 tabular-nums whitespace-nowrap">
														{displayTime(item.startTime)} – {displayTime(item.endTime)}
													</td>
													<td className="py-2.5 pr-3">{item.student.name}</td>
													<td className="py-2.5 pr-3">{item.instructor.name || "—"}</td>
													<td className="py-2.5 pr-3">
														<Badge className={cn("font-normal", LESSON_TYPE_COLORS[item.lessonType])}>
															{t(lessonTypeKey(item.lessonType))}
														</Badge>
													</td>
													<td className="py-2.5 pr-3">{item.branch.name}</td>
													<td className="py-2.5 pr-3">
														<Badge className={cn("font-normal", BOOKING_STATUS_BADGE_CLASS[canon])}>
															{t(canon)}
														</Badge>
													</td>
													<td className="py-2.5">{t(paymentKey(item.payment.status))}</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</AdminTableScroll>
						</TabsContent>

						<TabsContent value="week" className="mt-0 space-y-3">
							<div className="flex items-center justify-between gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setAnchorIso(yerevanAddCalendarDays(anchorIso, -7))}
								>
									<ChevronLeft className="h-4 w-4" />
									{t("adminClassSchedulePrevWeek")}
								</Button>
								<Button type="button" variant="outline" size="sm" onClick={() => setAnchorIso(yerevanTodayIso())}>
									{t("adminClassScheduleViewToday")}
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setAnchorIso(yerevanAddCalendarDays(anchorIso, 7))}
								>
									{t("adminClassScheduleNextWeek")}
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
								{weekDates.map((iso) => (
									<div key={iso} className="min-h-[120px] rounded-lg border border-border bg-card p-2 flex flex-col gap-1.5">
										<p className="text-xs font-semibold text-muted-foreground border-b pb-1">
											{formatShortDateFromIso(iso, lang)}
										</p>
										<div className="flex flex-col gap-1 flex-1 overflow-y-auto max-h-[280px]">
											{(itemsByDate.get(iso) ?? []).map((item) => renderLessonChip(item))}
										</div>
									</div>
								))}
							</div>
						</TabsContent>

						<TabsContent value="month" className="mt-0 space-y-3">
							<div className="flex items-center justify-between gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => {
										const [y, m] = anchorIso.split("-").map(Number);
										const prev = m === 1 ? `${y - 1}-12-01` : `${y}-${pad2(m - 1)}-01`;
										setAnchorIso(prev);
									}}
								>
									<ChevronLeft className="h-4 w-4" />
									{t("adminClassSchedulePrevMonth")}
								</Button>
								<span className="text-sm font-medium">
									{new Date(`${anchorIso.slice(0, 7)}-01T12:00:00`).toLocaleDateString(locale, {
										month: "long",
										year: "numeric",
									})}
								</span>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => {
										const [y, m] = anchorIso.split("-").map(Number);
										const next = m === 12 ? `${y + 1}-01-01` : `${y}-${pad2(m + 1)}-01`;
										setAnchorIso(next);
									}}
								>
									{t("adminClassScheduleNextMonth")}
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
							<div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-1">
								{weekDayShortHeaders(locale).map((h) => (
									<div key={h} className="py-1 font-medium">
										{h}
									</div>
								))}
							</div>
							<div className="grid grid-cols-7 gap-1">
								{monthGrid.map((cell) => {
									if (cell.type === "blank") {
										return <div key={cell.key} className="min-h-[88px] rounded-md bg-muted/20" />;
									}
									const dayItems = itemsByDate.get(cell.iso) ?? [];
									return (
										<div
											key={cell.key}
											className={cn(
												"min-h-[88px] rounded-md border border-border/70 bg-card p-1 flex flex-col",
												cell.iso === yerevanTodayIso() && "ring-1 ring-primary/40",
											)}
										>
											<span className="text-[11px] font-semibold text-muted-foreground mb-0.5">{cell.day}</span>
											<div className="flex flex-col gap-0.5 overflow-y-auto max-h-[72px]">
												{dayItems.slice(0, 3).map((item) => renderLessonChip(item, true))}
												{dayItems.length > 3 ? (
													<button
														type="button"
														className="text-[10px] text-primary hover:underline"
														onClick={() => setDetail(dayItems[3])}
													>
														+{dayItems.length - 3}
													</button>
												) : null}
											</div>
										</div>
									);
								})}
							</div>
						</TabsContent>

						<TabsContent value="custom" className="mt-0">
							<AdminTableScroll>
								<table className="w-full text-sm">
									<thead>
										<tr className="border-b text-left text-muted-foreground">
											<th className="py-2 pr-3 font-medium">{t("adminClassScheduleColDate")}</th>
											<th className="py-2 pr-3 font-medium">{t("adminClassScheduleColTime")}</th>
											<th className="py-2 pr-3 font-medium">{t("adminClassScheduleColStudent")}</th>
											<th className="py-2 pr-3 font-medium">{t("adminClassScheduleColInstructor")}</th>
											<th className="py-2 pr-3 font-medium">{t("adminClassScheduleColType")}</th>
											<th className="py-2 font-medium">{t("adminClassScheduleColStatus")}</th>
										</tr>
									</thead>
									<tbody>
										{items.map((item) => {
											const canon = toCanonicalBookingStatus(item.status);
											return (
												<tr
													key={item.id}
													className="border-b border-border/60 hover:bg-muted/40 cursor-pointer"
													onClick={() => setDetail(item)}
												>
													<td className="py-2.5 pr-3">{formatShortDateFromIso(item.date, lang)}</td>
													<td className="py-2.5 pr-3 tabular-nums">
														{displayTime(item.startTime)} – {displayTime(item.endTime)}
													</td>
													<td className="py-2.5 pr-3">{item.student.name}</td>
													<td className="py-2.5 pr-3">{item.instructor.name || "—"}</td>
													<td className="py-2.5 pr-3">
														<Badge className={cn("font-normal", LESSON_TYPE_COLORS[item.lessonType])}>
															{t(lessonTypeKey(item.lessonType))}
														</Badge>
													</td>
													<td className="py-2.5">
														<Badge className={cn("font-normal", BOOKING_STATUS_BADGE_CLASS[canon])}>
															{t(canon)}
														</Badge>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</AdminTableScroll>
						</TabsContent>
					</>
				)}
			</Tabs>

			<AppModal
				open={detail != null}
				onOpenChange={(open) => {
					if (!open) setDetail(null);
				}}
				title={t("adminClassScheduleDetailTitle")}
				contentClassName="max-w-lg"
				footer={
					detail ? (
						<Link href="/admin/bookings">
							<Button type="button" variant="outline" className="gap-2">
								<ExternalLink className="h-4 w-4" />
								{t("adminClassScheduleOpenBooking")}
							</Button>
						</Link>
					) : null
				}
			>
				{detail ? (
					<dl className="space-y-3 text-sm">
						<div className="grid grid-cols-[minmax(0,7rem)_1fr] gap-x-3 gap-y-2">
							<dt className="text-muted-foreground">{t("adminClassScheduleColStudent")}</dt>
							<dd>{detail.student.name}</dd>
							{detail.student.phone ? (
								<>
									<dt className="text-muted-foreground">{t("phoneNumber")}</dt>
									<dd>{detail.student.phone}</dd>
								</>
							) : null}
							<dt className="text-muted-foreground">{t("adminClassScheduleColInstructor")}</dt>
							<dd>{detail.instructor.name || "—"}</dd>
							<dt className="text-muted-foreground">{t("adminClassScheduleColType")}</dt>
							<dd>
								<Badge className={cn("font-normal", LESSON_TYPE_COLORS[detail.lessonType])}>
									{t(lessonTypeKey(detail.lessonType))}
								</Badge>
							</dd>
							<dt className="text-muted-foreground">{t("bookings")}</dt>
							<dd>{t(bookingTypeKey(detail.bookingType))}</dd>
							<dt className="text-muted-foreground">{t("adminClassScheduleColDate")}</dt>
							<dd>{formatShortDateFromIso(detail.date, lang)}</dd>
							<dt className="text-muted-foreground">{t("adminClassScheduleColTime")}</dt>
							<dd className="tabular-nums">
								{displayTime(detail.startTime)} – {displayTime(detail.endTime)}
							</dd>
							<dt className="text-muted-foreground">{t("adminClassScheduleColBranch")}</dt>
							<dd>{detail.branch.name}</dd>
							<dt className="text-muted-foreground">{t("adminClassScheduleColStatus")}</dt>
							<dd>
								<Badge
									className={cn(
										"font-normal",
										BOOKING_STATUS_BADGE_CLASS[toCanonicalBookingStatus(detail.status)],
									)}
								>
									{t(toCanonicalBookingStatus(detail.status))}
								</Badge>
							</dd>
							<dt className="text-muted-foreground">{t("adminClassScheduleColPayment")}</dt>
							<dd>{t(paymentKey(detail.payment.status))}</dd>
							{detail.package ? (
								<>
									<dt className="text-muted-foreground">{t("packages")}</dt>
									<dd>
										{detail.package.name}
										{detail.package.isIncludedLesson ? (
											<span className="text-muted-foreground"> · {t("adminClassSchedulePackageIncluded")}</span>
										) : null}
									</dd>
								</>
							) : null}
							{detail.totalPriceAmd != null && detail.totalPriceAmd > 0 ? (
								<>
									<dt className="text-muted-foreground">{t("total")}</dt>
									<dd>{detail.totalPriceAmd.toLocaleString(locale)} AMD</dd>
								</>
							) : null}
							{detail.notes ? (
								<>
									<dt className="text-muted-foreground">{t("adminClassScheduleNotes")}</dt>
									<dd className="text-muted-foreground">{detail.notes}</dd>
								</>
							) : null}
						</div>
					</dl>
				) : null}
			</AppModal>
		</AdminLayout>
	);
}
