import InstructorPanelLayout from "src/components/InstructorPanelLayout";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Calendar, Clock, User, ArrowRight, LayoutDashboard, BookOpen } from "lucide-react";
import { Link } from "wouter";
import { CountUpText } from "src/lib/motion";
import { useMemo } from "react";
import { useAccount } from "src/modules/accounts";
import { useInstructorPanelBookings, useInstructorPanelStudents } from "src/modules/instructor/useInstructorPanelData";
import { useInstructorTeachingScope } from "src/modules/instructor/useInstructorTeachingScope";
import { yerevanAddCalendarDays, yerevanTodayIso } from "src/lib/yerevanLessonCalendar";

const SLOT_LIKE = ["confirmed", "pending", "pending_prebook", "pending_payment", "completed"] as const;

function isSlotReservingStatus(s: string): boolean {
	return (SLOT_LIKE as readonly string[]).includes(s);
}

function displayTimeHHMM(time: string): string {
	const t = time.trim();
	return t.length >= 5 ? t.slice(0, 5) : t;
}

const localeByLang = { en: "en-US", ru: "ru-RU", am: "hy-AM" } as const;

export default function InstructorDashboard() {
	const { t, lang } = useLang();
	const { user } = useAccount();
	const { teachesPractical, teachesTheory, loading: scopeLoading } = useInstructorTeachingScope();
	const { bookings, loading: loadingBk, error: errBk } = useInstructorPanelBookings(user);
	const { students, loading: loadingSt, error: errSt } = useInstructorPanelStudents(
		teachesPractical ? user : null,
	);

	const relevantBookings = useMemo(() => {
		return bookings.filter((b) => {
			if (b.type === "practical") return teachesPractical;
			if (b.type === "theory" || b.type === "theory_personal") return teachesTheory;
			return teachesPractical || teachesTheory;
		});
	}, [bookings, teachesPractical, teachesTheory]);

	const upcoming = useMemo(() => {
		const tomorrowY = yerevanAddCalendarDays(yerevanTodayIso(), 1);
		return relevantBookings
			.filter((b) => b.dateIso === tomorrowY && isSlotReservingStatus(b.status))
			.slice()
			.sort((a, b) => a.dateIso.localeCompare(b.dateIso) || a.time.localeCompare(b.time));
	}, [relevantBookings]);

	const totalBookings = relevantBookings.length;
	const locale = localeByLang[lang] ?? "en-US";

	const fmtDate = (dateIso: string) => {
		const d = new Date(`${dateIso}T12:00:00`);
		return d.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
	};

	const loading = loadingBk || loadingSt || scopeLoading;
	const loadError = errBk || (teachesPractical ? errSt : null);
	const showStudentsKpi = teachesPractical;
	const kpiCols = showStudentsKpi ? "sm:grid-cols-3" : "sm:grid-cols-2";

	return (
		<InstructorPanelLayout>
			<PanelPageHeader
				className="mb-8"
				icon={LayoutDashboard}
				title={t("instructorDashboardTitle")}
				subtitle={
					teachesTheory && !teachesPractical
						? t("instructorKpiNextDaysTheory")
						: t("instructorKpiNextDays")
				}
			/>

			{loadError ? <p className="text-sm text-destructive mb-4">{loadError}</p> : null}
			{loading ? <p className="text-sm text-muted-foreground mb-6">{t("loading")}</p> : null}

			<div className={`grid grid-cols-1 ${kpiCols} gap-4 mb-8`}>
				<Card className="p-6 border-border">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-muted-foreground mb-1">{t("instructorKpiUpcomingTitle")}</p>
							<p className="text-3xl font-bold text-foreground">
								<CountUpText value={upcoming.length} />
							</p>
						</div>
						<div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
							<Calendar className="w-6 h-6 text-primary" />
						</div>
					</div>
				</Card>
				{showStudentsKpi ? (
					<Card className="p-6 border-border">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground mb-1">{t("instructorNavStudents")}</p>
								<p className="text-3xl font-bold text-foreground">
									<CountUpText value={students.length} />
								</p>
							</div>
							<div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
								<User className="w-6 h-6 text-primary" />
							</div>
						</div>
					</Card>
				) : null}
				<Card className="p-6 border-border">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-muted-foreground mb-1">{t("bookings")}</p>
							<p className="text-3xl font-bold text-foreground">
								<CountUpText value={totalBookings} />
							</p>
						</div>
						<div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
							<Clock className="w-6 h-6 text-primary" />
						</div>
					</div>
				</Card>
			</div>

			{teachesTheory ? (
				<Card className="p-5 border-border mb-6">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<div className="flex items-start gap-3 min-w-0">
							<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
								<BookOpen className="w-5 h-5 text-primary" aria-hidden />
							</div>
							<div className="min-w-0">
								<p className="font-semibold text-foreground">{t("instructorQuestionsNav")}</p>
								<p className="text-sm text-muted-foreground">{t("instructorQuestionsDashboardHint")}</p>
							</div>
						</div>
						<Link
							href="/instructor/questions"
							className="text-sm font-medium text-primary inline-flex items-center gap-1 hover:underline shrink-0"
						>
							{t("instructorQuestionsOpen")} <ArrowRight className="w-4 h-4" />
						</Link>
					</div>
				</Card>
			) : null}

			<Card className="p-6 border-border">
				<div className="flex items-center justify-between gap-4 mb-4">
					<h3 className="font-semibold text-foreground">{t("instructorKpiUpcomingTitle")}</h3>
					<Link
						href="/instructor/class-schedule"
						className="text-sm font-medium text-primary inline-flex items-center gap-1 hover:underline"
					>
						{t("instructorClassSchedule")} <ArrowRight className="w-4 h-4" />
					</Link>
				</div>
				<div className="space-y-3">
					{upcoming.map((row) => {
						const typeKey =
							row.type === "theory"
								? ("lessonTypeTheory" as const)
								: row.type === "theory_personal"
									? ("lessonTypeTheoryPersonal" as const)
									: ("lessonTypePractical" as const);
						const st =
							row.status === "confirmed"
								? ("confirmed" as const)
								: row.status === "cancelled"
									? ("cancelled" as const)
									: ("pending" as const);
						return (
							<div
								key={row.id}
								className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 border-b border-border last:border-0"
							>
								<div>
									<p className="font-medium text-foreground">{row.studentName}</p>
									<p className="text-sm text-muted-foreground">
										{fmtDate(row.dateIso)} · {displayTimeHHMM(row.time)} · {t(typeKey)}
									</p>
								</div>
								<Badge
									className={
										st === "confirmed"
											? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
											: st === "cancelled"
												? "bg-red-100 text-red-700 hover:bg-red-100"
												: "bg-amber-100 text-amber-800 hover:bg-amber-100"
									}
								>
									{t(st)}
								</Badge>
							</div>
						);
					})}
				</div>
				{!loading && upcoming.length === 0 ? (
					<p className="text-sm text-muted-foreground pt-2">{t("tableNoMatches")}</p>
				) : null}
			</Card>
		</InstructorPanelLayout>
	);
}
