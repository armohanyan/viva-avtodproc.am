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
	initAdminBranchFilterFromStorage,
	setAdminBranchFilterId as persistBranchFilterId,
	setAdminPanelActive,
} from "./adminBranchFilter";

type AdminBranchFilterContextValue = {
	branchId: string | null;
	setBranchId: (id: string | null) => void;
	revision: number;
};

const AdminBranchFilterContext = createContext<AdminBranchFilterContextValue | null>(null);

export function AdminBranchFilterProvider({ children }: PropsWithChildren) {
	const [branchId, setBranchIdState] = useState<string | null>(() => getAdminBranchFilterId());
	const [revision, setRevision] = useState(0);

	useEffect(() => {
		setAdminPanelActive(true);
		initAdminBranchFilterFromStorage();
		setBranchIdState(getAdminBranchFilterId());
		return () => {
			setAdminPanelActive(false);
		};
	}, []);

	const setBranchId = useCallback((id: string | null) => {
		const normalized = !id || id === ADMIN_BRANCH_FILTER_ALL ? null : String(id);
		if (normalized === branchId) return;
		persistBranchFilterId(normalized);
	}, [branchId]);

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

/** Returns `0` outside the admin layout (e.g. student dashboard). */
export function useOptionalAdminBranchFilterRevision(): number {
	return useContext(AdminBranchFilterContext)?.revision ?? 0;
}
