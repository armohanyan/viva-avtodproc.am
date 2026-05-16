import { AppModal } from "src/components/AppModal";
import { BookingCancellationPolicyCallout } from "src/components/booking/BookingCancellationPolicyCallout";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Card } from "src/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "src/components/ui/tabs";
import { BOOKING_STATUS_BADGE_CLASS } from "src/constants/booking.constants";
import { formatShortDateFromIso, localeForLang } from "src/lib/adminFormat";
import { useLang, type TranslationKey } from "src/lib/i18n";
import { yerevanAddCalendarDays, yerevanTodayIso, yerevanWeekRangeContaining } from "src/lib/yerevanLessonCalendar";
import { cn } from "src/lib/utils";
import {
	buildMonthGridCells,
	displayTime,
	enumerateIsoDates,
	pad2,
	slotDurationMinutes,
	weekDayShortHeaders,
} from "src/modules/lessonsSchedule/lessonsScheduleCalendarUtils";
import {
	STUDENT_LESSON_TYPE_STYLES,
	type StudentLessonFilter,
	type StudentScheduleItem,
	type StudentScheduleView,
} from "src/modules/lessonsSchedule/studentLessonsSchedule.types";
import { useStudentLessonsSchedule } from "src/modules/lessonsSchedule/useStudentLessonsSchedule";
import { toCanonicalBookingStatus } from "src/utils/booking.utils";
import {
	BookOpen,
	CalendarDays,
	Car,
	ChevronLeft,
	ChevronRight,
	GraduationCap,
	Loader2,
	MapPin,
	User,
} from "lucide-react";
import { useMemo, useState } from "react";

function lessonTypeKey(type: StudentScheduleItem["lessonType"]): TranslationKey {
	if (type === "theory") return "lessonTypeTheory";
	if (type === "theory_personal") return "lessonTypeTheoryPersonal";
	return "lessonTypePractical";
}

function lessonTypeIcon(type: StudentScheduleItem["lessonType"]) {
	if (type === "theory") return GraduationCap;
	if (type === "theory_personal") return BookOpen;
	return Car;
}

function bookingTypeKey(type: StudentScheduleItem["bookingType"]): TranslationKey {
	if (type === "package") return "adminClassScheduleBookingTypePackage";
	if (type === "group") return "adminClassScheduleBookingTypeGroup";
	if (type === "personal_theory") return "adminClassScheduleBookingTypePersonalTheory";
	return "adminClassScheduleBookingTypeSingle";
}

function paymentStatusKey(status: StudentScheduleItem["payment"]["status"]): TranslationKey {
	if (status === "paid") return "adminClassSchedulePaymentPaid";
	if (status === "free") return "adminClassSchedulePaymentFree";
	if (status === "pending") return "adminClassSchedulePaymentPending";
	return "adminClassSchedulePaymentNotRequired";
}

type Props = {
	className?: string;
};

export default function StudentLessonsCalendar({ className }: Props) {
	const { t, lang } = useLang();
	const locale = localeForLang(lang);

	const [view, setView] = useState<StudentScheduleView>("week");
	const [anchorIso, setAnchorIso] = useState(yerevanTodayIso());
	const [lessonFilter, setLessonFilter] = useState<StudentLessonFilter>("all");
	const [detail, setDetail] = useState<StudentScheduleItem | null>(null);

	const { data, loading, error, refresh } = useStudentLessonsSchedule({
		view,
		anchorIso,
		lessonType: lessonFilter,
	});

	const items = data?.items ?? [];
	const meta = data?.meta;

	const itemsByDate = useMemo(() => {
		const map = new Map<string, StudentScheduleItem[]>();
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
		if (meta.startDate === meta.endDate) {
			return formatShortDateFromIso(meta.startDate, lang);
		}
		return `${formatShortDateFromIso(meta.startDate, lang)} – ${formatShortDateFromIso(meta.endDate, lang)}`;
	}, [meta, lang]);

	const navPrev = () => {
		if (view === "week") setAnchorIso(yerevanAddCalendarDays(anchorIso, -7));
		else if (view === "day") setAnchorIso(yerevanAddCalendarDays(anchorIso, -1));
		else {
			const [y, m] = anchorIso.split("-").map(Number);
			setAnchorIso(m === 1 ? `${y - 1}-12-01` : `${y}-${pad2(m - 1)}-01`);
		}
	};

	const navNext = () => {
		if (view === "week") setAnchorIso(yerevanAddCalendarDays(anchorIso, 7));
		else if (view === "day") setAnchorIso(yerevanAddCalendarDays(anchorIso, 1));
		else {
			const [y, m] = anchorIso.split("-").map(Number);
			setAnchorIso(m === 12 ? `${y + 1}-01-01` : `${y}-${pad2(m + 1)}-01`);
		}
	};

	const monthTitle =
		view === "month"
			? new Date(`${anchorIso.slice(0, 7)}-01T12:00:00`).toLocaleDateString(locale, {
					month: "long",
					year: "numeric",
				})
			: null;

	const renderLessonChip = (item: StudentScheduleItem, compact?: boolean) => {
		const styles = STUDENT_LESSON_TYPE_STYLES[item.lessonType];
		const Icon = lessonTypeIcon(item.lessonType);
		return (
			<button
				key={item.id}
				type="button"
				onClick={() => setDetail(item)}
				className={cn(
					"w-full text-left rounded-md border bg-card shadow-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border-l-4",
					styles.border,
					compact && "text-[11px] leading-tight py-1 px-1.5",
					!compact && "px-2 py-1.5",
				)}
			>
				<div className="flex items-start gap-1.5 min-w-0">
					<Icon className={cn("h-3.5 w-3.5 shrink-0 mt-0.5", styles.icon)} aria-hidden />
					<div className="min-w-0 flex-1">
						<div className="font-medium text-foreground truncate tabular-nums">
							{displayTime(item.startTime)}–{displayTime(item.endTime)}
						</div>
						<div className="truncate text-muted-foreground">{t(lessonTypeKey(item.lessonType))}</div>
						{!compact ? (
							<>
								<div className="truncate text-muted-foreground text-[11px]">{item.instructor.name || "—"}</div>
								<div className="truncate text-muted-foreground text-[11px]">{item.branch.name}</div>
							</>
						) : null}
					</div>
				</div>
			</button>
		);
	};

	return (
		<div className={cn("space-y-4 min-w-0", className)}>
			<Tabs
				value={view}
				onValueChange={(v) => {
					const next = v as StudentScheduleView;
					setView(next);
					if (next === "day" || next === "week") setAnchorIso(yerevanTodayIso());
				}}
			>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<TabsList className="flex-wrap h-auto w-full sm:w-auto">
						<TabsTrigger value="week">{t("adminClassScheduleViewWeek")}</TabsTrigger>
						<TabsTrigger value="month">{t("adminClassScheduleViewMonth")}</TabsTrigger>
						<TabsTrigger value="day">{t("dashboardLessonsViewDay")}</TabsTrigger>
					</TabsList>
					{periodLabel ? (
						<p className="text-sm font-medium text-foreground tabular-nums text-center sm:text-right">{periodLabel}</p>
					) : null}
				</div>

				<Card className="p-3 sm:p-4 space-y-3 overflow-hidden">
					<div className="flex flex-wrap gap-2" role="group" aria-label={t("dashboardLessonsFilterLabel")}>
						{(
							[
								["all", "dashboardLessonsFilterAll"],
								["practical", "dashboardLessonsFilterPractical"],
								["theory_personal", "dashboardLessonsFilterPersonalTheory"],
								["theory", "dashboardLessonsFilterGroupTheory"],
							] as const
						).map(([value, labelKey]) => (
							<Button
								key={value}
								type="button"
								size="sm"
								variant={lessonFilter === value ? "default" : "outline"}
								className="h-8 text-xs"
								onClick={() => setLessonFilter(value)}
							>
								{t(labelKey)}
							</Button>
						))}
					</div>

					<div className="flex flex-wrap items-center justify-between gap-2">
						<Button type="button" variant="outline" size="sm" onClick={navPrev} aria-label={t("dashboardLessonsPrev")}>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<div className="flex flex-wrap items-center justify-center gap-2 min-w-0 flex-1">
							{monthTitle ? <span className="text-sm font-semibold truncate">{monthTitle}</span> : null}
							<Button type="button" variant="outline" size="sm" onClick={() => setAnchorIso(yerevanTodayIso())}>
								{t("adminClassScheduleViewToday")}
							</Button>
						</div>
						<Button type="button" variant="outline" size="sm" onClick={navNext} aria-label={t("dashboardLessonsNext")}>
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</Card>

				{loading ? (
					<div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
						<Loader2 className="h-6 w-6 animate-spin" />
						<span>{t("loading")}</span>
					</div>
				) : error ? (
					<Card className="p-8 text-center space-y-3">
						<p className="text-destructive text-sm">{error}</p>
						<Button type="button" onClick={() => void refresh()}>
							{t("adminClassScheduleRetry")}
						</Button>
					</Card>
				) : items.length === 0 ? (
					<Card className="p-10 sm:p-12 text-center space-y-2">
						<CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/60" aria-hidden />
						<p className="text-muted-foreground text-sm">{t("dashboardLessonsEmpty")}</p>
					</Card>
				) : (
					<>
						<TabsContent value="week" className="mt-0 space-y-3 min-w-0">
							<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2 min-w-0">
								{weekDates.map((iso) => (
									<div
										key={iso}
										className={cn(
											"min-h-[100px] rounded-lg border border-border bg-card p-2 flex flex-col gap-1.5 min-w-0",
											iso === yerevanTodayIso() && "ring-1 ring-primary/40",
										)}
									>
										<p className="text-xs font-semibold text-muted-foreground border-b pb-1 truncate">
											{formatShortDateFromIso(iso, lang)}
										</p>
										<div className="flex flex-col gap-1 flex-1 overflow-y-auto max-h-[240px] sm:max-h-[280px]">
											{(itemsByDate.get(iso) ?? []).map((item) => renderLessonChip(item))}
										</div>
									</div>
								))}
							</div>
						</TabsContent>

						<TabsContent value="month" className="mt-0 space-y-3 min-w-0 overflow-x-auto">
							<div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-1 min-w-[280px]">
								{weekDayShortHeaders(locale).map((h) => (
									<div key={h} className="py-1 font-medium">
										{h}
									</div>
								))}
							</div>
							<div className="grid grid-cols-7 gap-1 min-w-[280px]">
								{monthGrid.map((cell) => {
									if (cell.type === "blank") {
										return <div key={cell.key} className="min-h-[72px] sm:min-h-[88px] rounded-md bg-muted/20" />;
									}
									const dayItems = itemsByDate.get(cell.iso) ?? [];
									return (
										<div
											key={cell.key}
											className={cn(
												"min-h-[72px] sm:min-h-[88px] rounded-md border border-border/70 bg-card p-1 flex flex-col min-w-0",
												cell.iso === yerevanTodayIso() && "ring-1 ring-primary/40",
											)}
										>
											<span className="text-[11px] font-semibold text-muted-foreground mb-0.5">{cell.day}</span>
											<div className="flex flex-col gap-0.5 overflow-y-auto max-h-[56px] sm:max-h-[72px]">
												{dayItems.slice(0, 3).map((item) => renderLessonChip(item, true))}
												{dayItems.length > 3 ? (
													<button
														type="button"
														className="text-[10px] text-primary hover:underline text-left"
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

						<TabsContent value="day" className="mt-0 space-y-3 min-w-0">
							<div
								className={cn(
									"rounded-lg border border-border bg-card p-3 sm:p-4 min-w-0",
									anchorIso === yerevanTodayIso() && "ring-1 ring-primary/40",
								)}
							>
								<p className="text-sm font-semibold text-foreground mb-3">
									{formatShortDateFromIso(anchorIso, lang)}
								</p>
								{(itemsByDate.get(anchorIso) ?? []).length === 0 ? (
									<p className="text-sm text-muted-foreground">{t("dashboardLessonsEmptyDay")}</p>
								) : (
									<div className="flex flex-col gap-2 max-w-xl">
										{(itemsByDate.get(anchorIso) ?? []).map((item) => renderLessonChip(item))}
									</div>
								)}
							</div>
						</TabsContent>
					</>
				)}
			</Tabs>

			<AppModal
				open={detail != null}
				onOpenChange={(open) => {
					if (!open) setDetail(null);
				}}
				title={t("dashboardLessonsDetailTitle")}
				contentClassName="max-w-lg w-[calc(100vw-2rem)] sm:w-full"
			>
				{detail ? (
					<div className="space-y-4 text-sm min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<Badge className={cn("font-normal border", STUDENT_LESSON_TYPE_STYLES[detail.lessonType].chip)}>
								{t(lessonTypeKey(detail.lessonType))}
							</Badge>
							<Badge
								className={cn(
									"font-normal",
									BOOKING_STATUS_BADGE_CLASS[toCanonicalBookingStatus(detail.status)],
								)}
							>
								{t(toCanonicalBookingStatus(detail.status))}
							</Badge>
						</div>

						<dl className="grid grid-cols-1 sm:grid-cols-[minmax(0,7rem)_1fr] gap-x-3 gap-y-2.5">
							<dt className="text-muted-foreground flex items-center gap-1.5">
								<User className="h-3.5 w-3.5 shrink-0" aria-hidden />
								{t("dashboardLessonsColInstructor")}
							</dt>
							<dd>{detail.instructor.name || "—"}</dd>

							<dt className="text-muted-foreground flex items-center gap-1.5">
								<MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
								{t("adminClassScheduleColBranch")}
							</dt>
							<dd>
								{detail.branch.name}
								{detail.branch.address ? (
									<span className="block text-xs text-muted-foreground mt-0.5">{detail.branch.address}</span>
								) : null}
							</dd>

							<dt className="text-muted-foreground">{t("adminClassScheduleColDate")}</dt>
							<dd>{formatShortDateFromIso(detail.date, lang)}</dd>

							<dt className="text-muted-foreground">{t("adminClassScheduleColTime")}</dt>
							<dd className="tabular-nums">
								{displayTime(detail.startTime)} – {displayTime(detail.endTime)}
								<span className="text-muted-foreground">
									{" "}
									· {slotDurationMinutes(detail.startTime, detail.endTime)} {t("dashboardLessonsMinutes")}
								</span>
							</dd>

							<dt className="text-muted-foreground">{t("dashboardLessonsBookingType")}</dt>
							<dd>{t(bookingTypeKey(detail.bookingType))}</dd>

							{detail.package ? (
								<>
									<dt className="text-muted-foreground">{t("dashboardLessonsPackage")}</dt>
									<dd>{detail.package.name}</dd>
								</>
							) : null}

							<dt className="text-muted-foreground">{t("adminClassScheduleColPayment")}</dt>
							<dd>{t(paymentStatusKey(detail.payment.status))}</dd>

							{detail.totalPriceAmd != null && detail.totalPriceAmd > 0 ? (
								<>
									<dt className="text-muted-foreground">{t("dashboardLessonsPrice")}</dt>
									<dd className="tabular-nums">{detail.totalPriceAmd.toLocaleString()} ֏</dd>
								</>
							) : null}

							{detail.car ? (
								<>
									<dt className="text-muted-foreground flex items-center gap-1.5">
										<Car className="h-3.5 w-3.5 shrink-0" aria-hidden />
										{t("dashboardLessonsColCar")}
									</dt>
									<dd>
										{detail.car.label}
										{detail.car.transmission && detail.car.transmission !== "—" ? (
											<span className="text-muted-foreground"> · {detail.car.transmission}</span>
										) : null}
									</dd>
								</>
							) : null}

							{detail.theoryCohort ? (
								<>
									<dt className="text-muted-foreground">{t("dashboardLessonsColGroup")}</dt>
									<dd>{detail.theoryCohort.name}</dd>
								</>
							) : null}

							{detail.notes ? (
								<>
									<dt className="text-muted-foreground">{t("adminClassScheduleNotes")}</dt>
									<dd className="text-muted-foreground break-words">{detail.notes}</dd>
								</>
							) : null}
						</dl>

						{(detail.lessonType === "practical" || detail.lessonType === "theory_personal") &&
						(detail.cancelRefundEligible || detail.paymentRequiredNow) ? (
							<BookingCancellationPolicyCallout
								bookingType={detail.lessonType === "theory_personal" ? "theory_personal" : "practical"}
							/>
						) : null}

						{detail.paymentRequiredNow && detail.paymentRequiredAt ? (
							<p className="text-xs text-muted-foreground">{t("dashboardLessonsPaymentDueHint")}</p>
						) : null}
					</div>
				) : null}
			</AppModal>
		</div>
	);
}


