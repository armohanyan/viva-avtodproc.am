import InstructorPanelLayout from "src/components/InstructorPanelLayout";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Input } from "src/components/ui/input";
import DataTableToolbar from "src/components/DataTableToolbar";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Users } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";
import { useAccount } from "src/modules/accounts";
import {
	patchInstructorStudentFields,
	useInstructorPanelStudents,
	type InstructorPanelStudent,
} from "src/modules/instructor/useInstructorPanelData";
import { getApiErrorMessage } from "src/lib/api";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const statusColor: Record<string, string> = {
	active: "bg-emerald-100 text-emerald-700",
	inactive: "bg-slate-100 text-slate-500",
	completed: "bg-blue-100 text-blue-700",
};

export default function InstructorStudents() {
	const { t } = useLang();
	const { showToast } = useToast();
	const { user } = useAccount();
	const { students, loading, error, refresh, setStudents } = useInstructorPanelStudents(user);
	const [search, setSearch] = useState("");
	const [savingId, setSavingId] = useState<number | null>(null);
	const skillAtFocus = useRef<Map<number, number>>(new Map());

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		return students.filter((r) => {
			const hay = [
				r.name,
				r.status,
				String(r.skillRating),
				r.licenseAchieved ? t("studentLicenseAchieved") : t("studentLicenseNotYet"),
				t("studentLicense"),
			]
				.join(" ")
				.toLowerCase();
			return !q || hay.includes(q);
		});
	}, [students, search, t]);

	const ratingStats = useMemo(
		() =>
			Array.from({ length: 11 }, (_, rating) => {
				const group = students.filter((r) => r.skillRating === rating);
				const licensed = group.filter((r) => r.licenseAchieved).length;
				return { rating, total: group.length, licensed };
			}),
		[students],
	);
	const maxRatingGroup = useMemo(() => Math.max(...ratingStats.map((s) => s.total), 1), [ratingStats]);
	const ratingChartData = useMemo(
		() => ({
			labels: ratingStats.map((s) => `${s.rating}`),
			datasets: [
				{
					label: t("studentRatingTotal"),
					data: ratingStats.map((s) => s.total),
					backgroundColor: "rgba(59, 130, 246, 0.30)",
					borderColor: "rgba(59, 130, 246, 0.8)",
					borderWidth: 1,
				},
				{
					label: t("studentRatingLicensed"),
					data: ratingStats.map((s) => s.licensed),
					backgroundColor: "rgba(16, 185, 129, 0.35)",
					borderColor: "rgba(16, 185, 129, 0.9)",
					borderWidth: 1,
				},
			],
		}),
		[ratingStats, t],
	);

	const mergeUpdated = (updated: InstructorPanelStudent) => {
		setStudents((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
	};

	const persistSkillRating = async (studentId: number, skillRating: number) => {
		setSavingId(studentId);
		try {
			const row = await patchInstructorStudentFields(studentId, { skillRating });
			mergeUpdated(row);
		} catch (e) {
			showToast(getApiErrorMessage(e), "error");
			await refresh();
		} finally {
			setSavingId(null);
		}
	};

	const persistLicense = async (r: InstructorPanelStudent) => {
		setSavingId(r.id);
		try {
			const row = await patchInstructorStudentFields(r.id, { licenseAchieved: !r.licenseAchieved });
			mergeUpdated(row);
			showToast(t("profileSaved"), "success");
		} catch (e) {
			showToast(getApiErrorMessage(e), "error");
			await refresh();
		} finally {
			setSavingId(null);
		}
	};

	return (
		<InstructorPanelLayout>
			<PanelPageHeader icon={Users} title={t("instructorMyStudents")} subtitle={t("instructorStudentsPageSubtitle")} />

			{error ? <p className="text-sm text-destructive mb-3">{error}</p> : null}
			{loading ? <p className="text-sm text-muted-foreground mb-3">{t("loading")}</p> : null}

			<Card className="border-border overflow-hidden">
				<DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`} />
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead className="bg-muted/40">
							<tr>
								<th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider whitespace-nowrap">
									{t("name")}
								</th>
								<th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider whitespace-nowrap">
									{t("status")}
								</th>
								<th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider whitespace-nowrap">
									{t("studentSkillRating")}
								</th>
								<th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider whitespace-nowrap">
									{t("studentLicense")}
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{filtered.map((r) => (
								<tr key={r.id} className="hover:bg-muted/30">
									<td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
									<td className="px-4 py-3">
										<Badge className={statusColor[r.status] ?? "bg-muted text-muted-foreground"}>
											{r.status === "completed"
												? t("userStatusCompleted")
												: r.status === "active" || r.status === "inactive"
													? t(r.status)
													: r.status}
										</Badge>
									</td>
									<td className="px-4 py-3">
										<Input
											type="number"
											min={0}
											max={10}
											className="h-8 w-20"
											disabled={savingId === r.id}
											value={r.skillRating}
											onFocus={() => skillAtFocus.current.set(r.id, r.skillRating)}
											onChange={(e) => {
												const next = Math.max(0, Math.min(10, Number(e.target.value) || 0));
												setStudents((prev) => prev.map((x) => (x.id === r.id ? { ...x, skillRating: next } : x)));
											}}
											onBlur={() => {
												const was = skillAtFocus.current.get(r.id);
												const cur = students.find((x) => x.id === r.id);
												if (cur == null || was === cur.skillRating) return;
												void persistSkillRating(cur.id, cur.skillRating);
											}}
										/>
									</td>
									<td className="px-4 py-3">
										<button
											type="button"
											disabled={savingId === r.id}
											onClick={() => void persistLicense(r)}
											className="text-xs px-2.5 py-1.5 rounded-md border border-input hover:bg-accent disabled:opacity-50"
										>
											{r.licenseAchieved ? t("studentLicenseAchieved") : t("studentLicenseNotYet")}
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				{filtered.length === 0 && <p className="p-6 text-sm text-muted-foreground text-center">{t("tableNoMatches")}</p>}
			</Card>
			<Card className="border-border overflow-hidden mt-4">
				<div className="px-4 py-3 border-b border-border">
					<h3 className="font-semibold text-foreground text-sm">{t("studentRatingStatsTitle")}</h3>
				</div>
				<div className="p-4 sm:p-5 border-b border-border/70">
					<Bar
						data={ratingChartData}
						options={{
							responsive: true,
							maintainAspectRatio: false,
							plugins: { legend: { position: "top" } },
							scales: {
								x: { title: { display: true, text: "Rating (0-10)" } },
								y: { beginAtZero: true, suggestedMax: maxRatingGroup, ticks: { precision: 0 } },
							},
						}}
						height={220}
					/>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-sm min-w-[28rem]">
						<thead className="bg-muted/40">
							<tr>
								{[t("studentSkillRating"), t("studentRatingTotal"), t("studentRatingLicensed"), t("studentRatingLicenseRate")].map((h) => (
									<th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider whitespace-nowrap">
										{h}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{ratingStats.map((s) => (
								<tr key={s.rating} className="hover:bg-muted/20">
									<td className="px-4 py-2.5 font-medium">{s.rating}/10</td>
									<td className="px-4 py-2.5 text-muted-foreground">{s.total}</td>
									<td className="px-4 py-2.5 text-muted-foreground">{s.licensed}</td>
									<td className="px-4 py-2.5 text-muted-foreground">{s.total > 0 ? `${Math.round((s.licensed / s.total) * 100)}%` : "—"}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Card>
		</InstructorPanelLayout>
	);
}
