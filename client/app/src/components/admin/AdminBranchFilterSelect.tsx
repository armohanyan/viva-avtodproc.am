import { useMemo } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { useLang } from "src/lib/i18n";
import { branchOptionLabel, useBranches } from "src/modules/branches";
import { useAdminBranchFilter } from "src/modules/admin/AdminBranchFilterProvider";
import { ADMIN_BRANCH_FILTER_ALL } from "src/modules/admin/adminBranchFilter";
import { cityNameById, useCities } from "src/modules/cities";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "src/components/ui/select";

export default function AdminBranchFilterSelect() {
	const { t, lang } = useLang();
	const { branchId, setBranchId } = useAdminBranchFilter();
	const { branches, loading } = useBranches();
	const { cities } = useCities();

	const selectedValue = branchId ?? ADMIN_BRANCH_FILTER_ALL;

	const selectedLabel = useMemo(() => {
		if (!branchId) return t("adminBranchFilterAll");
		const branch = branches.find((b) => String(b.id) === branchId);
		return branch ? branchOptionLabel(branch, cityNameById(cities, branch.cityId)) : branchId;
	}, [branchId, branches, cities, lang, t]);

	const triggerLabel = loading && branches.length === 0 ? t("loading") : selectedLabel;

	return (
		<Select
			value={selectedValue}
			onValueChange={(value) => setBranchId(value === ADMIN_BRANCH_FILTER_ALL ? null : value)}
			disabled={loading && branches.length === 0}
		>
			<SelectTrigger
				size="sm"
				className="max-w-[11rem] sm:max-w-[14rem] h-8 gap-1.5 border-border bg-background/80"
				aria-label={t("adminBranchFilterLabel")}
			>
				{loading && branches.length === 0 ? (
					<Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-muted-foreground" />
				) : (
					<MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
				)}
				<SelectValue placeholder={t("adminBranchFilterAll")}>{triggerLabel}</SelectValue>
			</SelectTrigger>
			<SelectContent align="end" className="max-h-[min(20rem,70vh)]">
				<SelectItem value={ADMIN_BRANCH_FILTER_ALL}>{t("adminBranchFilterAll")}</SelectItem>
				{branches.length === 0 && !loading ? (
					<SelectItem value="__empty__" disabled>
						{t("adminBranchFilterEmpty")}
					</SelectItem>
				) : null}
				{branches.map((b) => (
					<SelectItem key={b.id} value={String(b.id)}>
						{branchOptionLabel(b, cityNameById(cities, b.cityId))}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
