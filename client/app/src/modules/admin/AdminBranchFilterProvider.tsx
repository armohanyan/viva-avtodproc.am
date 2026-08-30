import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type PropsWithChildren,
} from "react";
import {
	ADMIN_BRANCH_FILTER_ALL,
	getAdminBranchFilterId,
	getAdminBranchFilterRevision,
	initAdminBranchFilterFromStorage,
	setAdminBranchFilterId as persistBranchFilterId,
	setAdminPanelActive,
	subscribeAdminBranchFilter,
} from "./adminBranchFilter";

type AdminBranchFilterContextValue = {
	branchId: string | null;
	setBranchId: (id: string | null) => void;
	revision: number;
};

const AdminBranchFilterContext = createContext<AdminBranchFilterContextValue | null>(null);

/** Tracks header branch filter; works even outside AdminBranchFilterProvider (e.g. director page shells). */
export function useAdminBranchFilterSnapshot(): {
	branchId: string | null;
	revision: number;
} {
	const [snapshot, setSnapshot] = useState(() => ({
		branchId: getAdminBranchFilterId(),
		revision: getAdminBranchFilterRevision(),
	}));

	useEffect(
		() =>
			subscribeAdminBranchFilter(() => {
				setSnapshot({
					branchId: getAdminBranchFilterId(),
					revision: getAdminBranchFilterRevision(),
				});
			}),
		[],
	);

	return snapshot;
}

export function AdminBranchFilterProvider({ children }: PropsWithChildren) {
	const { branchId, revision } = useAdminBranchFilterSnapshot();

	useEffect(() => {
		setAdminPanelActive(true);
		initAdminBranchFilterFromStorage();
		return () => {
			setAdminPanelActive(false);
		};
	}, []);

	const setBranchId = useCallback((id: string | null) => {
		const normalized = !id || id === ADMIN_BRANCH_FILTER_ALL ? null : String(id);
		persistBranchFilterId(normalized);
	}, []);

	const value = useMemo(
		() => ({ branchId, setBranchId, revision }),
		[branchId, setBranchId, revision],
	);

	return (
		<AdminBranchFilterContext.Provider value={value}>{children}</AdminBranchFilterContext.Provider>
	);
}

export function useAdminBranchFilter(): AdminBranchFilterContextValue {
	const ctx = useContext(AdminBranchFilterContext);
	if (!ctx) {
		throw new Error("useAdminBranchFilter must be used within AdminBranchFilterProvider");
	}
	return ctx;
}

/** Works inside and outside the admin layout provider tree. */
export function useOptionalAdminBranchFilterRevision(): number {
	const ctxRevision = useContext(AdminBranchFilterContext)?.revision;
	const { revision } = useAdminBranchFilterSnapshot();
	return ctxRevision ?? revision;
}
