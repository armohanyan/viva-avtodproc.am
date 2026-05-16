import { Input } from "src/components/ui/input";
import { useLang } from "src/lib/i18n";
import { formatShortDateFromIso } from "src/lib/adminFormat";
import { cn } from "src/lib/utils";
import { WEEKDAY_OPTIONS } from "src/modules/lessonsSchedule/lessonEvent.types";
import { useCallback, useEffect, useState } from "react";
import { cohortPreviewErrorMessage, fetchCohortSessionPreview, type CohortSessionPreviewRow } from "./cohortSessionPreview";

export type CohortScheduleFormSlice = {
	startDateIso: string;
	endDateIso: string;
	sessionStartTime: string;
	sessionEndTime: string;
	lessonWeekdays: number[];
	totalLessons: number;
};

type Props = {
	value: CohortScheduleFormSlice;
	onChange: (patch: Partial<CohortScheduleFormSlice>) => void;
	lang: string;
};

export default function CohortScheduleFields({ value, onChange, lang }: Props) {
	const { t } = useLang();
	const [preview, setPreview] = useState<CohortSessionPreviewRow[]>([]);
	const [previewLoading, setPreviewLoading] = useState(false);
	const [previewError, setPreviewError] = useState<string | null>(null);

	const toggleWeekday = (day: number) => {
		const set = new Set(value.lessonWeekdays);
		if (set.has(day)) set.delete(day);
		else set.add(day);
		onChange({ lessonWeekdays: [...set].sort((a, b) => a - b) });
	};

	const runPreview = useCallback(async () => {
		if (
			!value.startDateIso ||
			!value.sessionStartTime ||
			!value.sessionEndTime ||
			value.lessonWeekdays.length === 0 ||
			value.totalLessons < 1
		) {
			setPreview([]);
			setPreviewError(null);
			return;
		}
		setPreviewLoading(true);
		setPreviewError(null);
		try {
			const rows = await fetchCohortSessionPreview({
				startDateIso: value.startDateIso,
				endDateIso: value.endDateIso || value.startDateIso,
				lessonWeekdays: value.lessonWeekdays,
				sessionStartTime: value.sessionStartTime.slice(0, 5),
				sessionEndTime: value.sessionEndTime.slice(0, 5),
				totalLessons: value.totalLessons,
			});
			setPreview(rows);
		} catch (e) {
			setPreview([]);
			setPreviewError(cohortPreviewErrorMessage(e));
		} finally {
			setPreviewLoading(false);
		}
	}, [value]);

	useEffect(() => {
		const timer = window.setTimeout(() => {
			void runPreview();
		}, 400);
		return () => window.clearTimeout(timer);
	}, [runPreview]);

	return (
		<div className="space-y-3">
			<div>
				<label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("cohortLabelWeekdays")}</label>
				<div className="flex flex-wrap gap-2">
					{WEEKDAY_OPTIONS.map((d) => {
						const on = value.lessonWeekdays.includes(d.value);
						return (
							<button
								key={d.value}
								type="button"
								onClick={() => toggleWeekday(d.value)}
								className={cn(
									"px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
									on
										? "bg-primary text-primary-foreground border-primary"
										: "bg-background text-muted-foreground border-border hover:bg-muted/50",
								)}
							>
								{t(d.key)}
							</button>
						);
					})}
				</div>
			</div>

			<div>
				<label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortLabelTotalLessons")}</label>
				<Input
					type="number"
					min={1}
					value={value.totalLessons > 0 ? value.totalLessons : ""}
					onChange={(e) => onChange({ totalLessons: Math.max(0, parseInt(e.target.value, 10) || 0) })}
					className="h-10"
				/>
			</div>

			<div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
				<p className="text-sm font-medium text-foreground">{t("cohortSessionPreviewTitle")}</p>
				{previewLoading ? (
					<p className="text-xs text-muted-foreground">{t("loading")}</p>
				) : previewError ? (
					<p className="text-xs text-destructive">{previewError}</p>
				) : preview.length === 0 ? (
					<p className="text-xs text-muted-foreground">{t("cohortSessionPreviewEmpty")}</p>
				) : (
					<ul className="max-h-36 overflow-y-auto text-xs space-y-1 text-muted-foreground">
						{preview.map((row) => (
							<li key={`${row.dateIso}-${row.lessonIndex}`} className="tabular-nums">
								{t("cohortSessionPreviewLesson")} {row.lessonIndex}/{preview.length} ·{" "}
								{formatShortDateFromIso(row.dateIso, lang)} · {row.startTime}–{row.endTime}
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
