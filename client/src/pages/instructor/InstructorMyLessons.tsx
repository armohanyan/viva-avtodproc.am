import InstructorPanelLayout from "src/components/InstructorPanelLayout";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import PanelPageHeader from "src/components/PanelPageHeader";
import { BookOpen } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useAccount } from "src/modules/accounts";
import {
	patchBookingLessonPassed,
	useInstructorPanelBookings,
	type InstructorPanelBooking,
} from "src/modules/instructor/useInstructorPanelData";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage } from "src/lib/api";
import {
	hasLessonWindowEnded,
	yerevanAddCalendarDays,
	yerevanTodayIso,
} from "src/lib/yerevanLessonCalendar";

const SLOT_LIKE = ["confirmed", "pending", "pending_prebook", "pending_payment", "completed"] as const;

function isSlotReservingStatus(s: string): boolean {
	return (SLOT_LIKE as readonly string[]).includes(s);
}

function displayTimeHHMM(time: string): string {
	const t = time.trim();
	return t.length >= 5 ? t.slice(0, 5) : t;
}

const localeByLang = { en: "en-US", ru: "ru-RU", am: "hy-AM" } as const;

export default function InstructorMyLessons() {
	const { t, lang } = useLang();
	const { showToast } = useToast();
	const { user } = useAccount();
	const { bookings, loading, error, refresh } = useInstructorPanelBookings(user);
	const [busyId, setBusyId] = useState<number | null>(null);

	const todayY = useMemo(() => yerevanTodayIso(), []);
	const tomorrowY = useMemo(() => yerevanAddCalendarDays(todayY, 1), [todayY]);

	const rows = useMemo(() => {
		return bookings
			.filter((b) => (b.dateIso === todayY || b.dateIso === tomorrowY) && isSlotReservingStatus(b.status))
			.slice()
			.sort((a, b) => a.dateIso.localeCompare(b.dateIso) || a.time.localeCompare(b.time));
	}, [bookings, todayY, tomorrowY]);

	const locale = localeByLang[lang] ?? "en-US";
	const fmtDate = (dateIso: string) => {
		const d = new Date(`${dateIso}T12:00:00`);
		return d.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" });
	};

	const saveLessonPassed = useCallback(
		async (b: InstructorPanelBooking, value: boolean | null) => {
			setBusyId(b.id);
			try {
				await patchBookingLessonPassed(b.id, value);
				showToast(t("lessonPassedSaved"), "success");
				await refresh();
			} catch (e) {
				showToast(getApiErrorMessage(e), "error");
			} finally {
				setBusyId(null);
			}
		},
		[refresh, showToast, t],
	);

	return (
		<InstructorPanelLayout>
			<PanelPageHeader
				className="mb-8"
				icon={BookOpen}
				title={t("instructorNavMyLessons")}
				subtitle={t("instructorMyLessonsPageSubtitle")}
			/>

			{error ? <p className="text-sm text-destructive mb-3">{error}</p> : null}
			{loading ? <p className="text-sm text-muted-foreground mb-3">{t("loading")}</p> : null}

			<Card className="p-6 border-border">
				<div className="space-y-4">
					{rows.map((row) => {
						const typeKey =
							row.type === "theory"
								? ("lessonTypeTheory" as const)
								: row.type === "theory_personal"
									? ("lessonTypeTheoryPersonal" as const)
									: ("lessonTypePractical" as const);
						const st =
							row.status === "confirmed" || row.status === "completed"
								? ("confirmed" as const)
								: row.status === "cancelled"
									? ("cancelled" as const)
									: ("pending" as const);
						const ended = hasLessonWindowEnded(row.dateIso, row.time, row.endTime);
						const showOutcome = ended;

						return (
							<div
								key={row.id}
								className="flex flex-col gap-3 py-4 border-b border-border last:border-0 sm:flex-row sm:items-center sm:justify-between"
							>
								<div className="min-w-0 flex-1">
									<p className="font-medium text-foreground">{row.studentName}</p>
									<p className="text-sm text-muted-foreground">
										{fmtDate(row.dateIso)} · {displayTimeHHMM(row.time)}
										{row.endTime ? `–${displayTimeHHMM(row.endTime)}` : null} · {t(typeKey)}
									</p>
								</div>
								<div className="flex flex-col gap-2 items-stretch sm:items-end shrink-0">
									<Badge
										className={
											st === "confirmed"
												? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 w-fit"
												: st === "cancelled"
													? "bg-red-100 text-red-700 hover:bg-red-100 w-fit"
													: "bg-amber-100 text-amber-800 hover:bg-amber-100 w-fit"
										}
									>
										{t(st)}
									</Badge>
									{showOutcome ? (
										<div className="flex flex-col gap-2 items-stretch sm:items-end">
											<div className="flex flex-wrap gap-2 justify-end">
												<Button
													type="button"
													size="sm"
													variant={row.lessonPassedSuccessfully === true ? "default" : "outline"}
													disabled={busyId === row.id}
													onClick={() => void saveLessonPassed(row, true)}
												>
													{t("lessonPassedPass")}
												</Button>
												<Button
													type="button"
													size="sm"
													variant={row.lessonPassedSuccessfully === false ? "destructive" : "outline"}
													className={
														row.lessonPassedSuccessfully === false ? "" : "border-destructive/50 text-destructive"
													}
													disabled={busyId === row.id}
													onClick={() => void saveLessonPassed(row, false)}
												>
													{t("lessonPassedFail")}
												</Button>
												<Button
													type="button"
													size="sm"
													variant="ghost"
													disabled={busyId === row.id || row.lessonPassedSuccessfully === null}
													onClick={() => void saveLessonPassed(row, null)}
												>
													{t("lessonPassedClear")}
												</Button>
											</div>
											<span className="text-xs text-muted-foreground text-right">
												{row.lessonPassedSuccessfully === null
													? t("lessonPassedNotSet")
													: row.lessonPassedSuccessfully
														? t("lessonPassedPass")
														: t("lessonPassedFail")}
											</span>
										</div>
									) : (
										<span className="text-xs text-muted-foreground">—</span>
									)}
								</div>
							</div>
						);
					})}
				</div>
				{!loading && rows.length === 0 ? (
					<p className="text-sm text-muted-foreground pt-2">{t("tableNoMatches")}</p>
				) : null}
			</Card>
		</InstructorPanelLayout>
	);
}
