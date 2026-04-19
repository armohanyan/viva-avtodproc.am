import InstructorPanelLayout from "src/components/InstructorPanelLayout";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import DataTableToolbar from "src/components/DataTableToolbar";
import TableColumnFilter, { TableColumnHeaderWithFilter } from "src/components/TableColumnFilter";
import PanelPageHeader from "src/components/PanelPageHeader";
import { CalendarClock } from "lucide-react";
import { useMemo, useState } from "react";
import { useAccount } from "src/modules/accounts";
import { useInstructorPanelBookings } from "src/modules/instructor/useInstructorPanelData";

const statusColor: Record<string, string> = {
	confirmed: "bg-emerald-100 text-emerald-700",
	pending: "bg-amber-100 text-amber-700",
	cancelled: "bg-red-100 text-red-600",
	refunded: "bg-slate-100 text-slate-600",
};
const typeColor: Record<string, string> = {
	practical: "bg-blue-100 text-blue-700",
	theory: "bg-purple-100 text-purple-700",
};

function displayTimeHHMM(time: string): string {
	const t = time.trim();
	return t.length >= 5 ? t.slice(0, 5) : t;
}

const localeByLang = { en: "en-US", ru: "ru-RU", am: "hy-AM" } as const;

export default function InstructorBookings() {
	const { t, lang } = useLang();
	const { user } = useAccount();
	const { bookings, loading, error } = useInstructorPanelBookings(user);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [typeFilter, setTypeFilter] = useState<"all" | "practical" | "theory">("all");

	const locale = localeByLang[lang] ?? "en-US";
	const fmtDate = (dateIso: string) => {
		const d = new Date(`${dateIso}T12:00:00`);
		return d.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
	};

	const rows = useMemo(
		() =>
			bookings.map((b) => ({
				...b,
				displayId: `BK-${b.id}`,
				dateLabel: fmtDate(b.dateIso),
				timeShort: displayTimeHHMM(b.time),
			})),
		[bookings, lang],
	);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		return rows.filter((b) => {
			const hay = [b.displayId, b.studentName, b.dateLabel, b.timeShort, b.type, b.status].join(" ").toLowerCase();
			const matchSearch = !q || hay.includes(q);
			const matchStatus = statusFilter === "all" || b.status === statusFilter;
			const matchType = typeFilter === "all" || b.type === typeFilter;
			return matchSearch && matchStatus && matchType;
		});
	}, [rows, search, statusFilter, typeFilter]);

	const statusLabel = (s: string) => {
		if (s === "confirmed" || s === "pending" || s === "cancelled") return t(s as "confirmed" | "pending" | "cancelled");
		if (s === "refunded") return t("refunded");
		return s;
	};

	return (
		<InstructorPanelLayout>
			<PanelPageHeader icon={CalendarClock} title={t("bookings")} subtitle={t("instructorBookingsPageSubtitle")} />

			{error ? <p className="text-sm text-destructive mb-3">{error}</p> : null}
			{loading ? <p className="text-sm text-muted-foreground mb-3">{t("loading")}</p> : null}

			<Card className="border-border overflow-hidden">
				<DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`} />

				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead className="bg-muted/40">
							<tr>
								<TableColumnHeaderWithFilter title={t("tableColId")} />
								<TableColumnHeaderWithFilter title={t("name")} />
								<TableColumnHeaderWithFilter title={t("date")} />
								<TableColumnHeaderWithFilter title={t("bookingTimeLabel")} />
								<TableColumnHeaderWithFilter
									title={t("filterByType")}
									filter={
										<TableColumnFilter
											value={typeFilter}
											onChange={(v) => setTypeFilter(v as "all" | "practical" | "theory")}
											ariaLabel={t("filterByType")}
											options={[
												{ value: "all", label: t("filterOptionAll") },
												{ value: "practical", label: t("lessonTypePractical") },
												{ value: "theory", label: t("lessonTypeTheory") },
											]}
										/>
									}
								/>
								<TableColumnHeaderWithFilter
									title={t("status")}
									filter={
										<TableColumnFilter
											value={statusFilter}
											onChange={setStatusFilter}
											ariaLabel={t("filterByStatus")}
											options={[
												{ value: "all", label: t("filterOptionAll") },
												{ value: "confirmed", label: t("confirmed") },
												{ value: "pending", label: t("pending") },
												{ value: "cancelled", label: t("cancelled") },
												{ value: "refunded", label: t("refunded") },
											]}
										/>
									}
								/>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{filtered.map((b) => (
								<tr key={b.id} className="hover:bg-muted/30">
									<td className="px-4 py-3 font-mono text-xs text-muted-foreground">{b.displayId}</td>
									<td className="px-4 py-3 font-medium text-foreground">{b.studentName}</td>
									<td className="px-4 py-3 whitespace-nowrap">{b.dateLabel}</td>
									<td className="px-4 py-3 whitespace-nowrap">{b.timeShort}</td>
									<td className="px-4 py-3">
										<Badge className={typeColor[b.type] ?? ""}>
											{t(b.type === "theory" ? "lessonTypeTheory" : "lessonTypePractical")}
										</Badge>
									</td>
									<td className="px-4 py-3">
										<Badge className={statusColor[b.status] ?? "bg-muted text-muted-foreground"}>{statusLabel(b.status)}</Badge>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				{filtered.length === 0 && <p className="p-6 text-sm text-muted-foreground text-center">{t("tableNoMatches")}</p>}
			</Card>
		</InstructorPanelLayout>
	);
}
