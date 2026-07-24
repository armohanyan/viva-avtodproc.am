import { loadAccountSession } from "src/modules/accounts/account.session";

export const ADMIN_BRANCH_FILTER_STORAGE_KEY = "viva-admin-branch-filter-v1";
export const ADMIN_BRANCH_FILTER_ALL = "all";

const BRANCH_FILTER_PATH_PREFIXES = [
	"/bookings",
	"/students",
	"/finance/transactions",
	"/admin/class-schedule",
	"/admin/reports",
	"/admin/finance/expenses",
	"/admin/petrol-expenses",
	"/admin/instructor-km-logs",
	"/admin/petrol-fuel-km",
	"/theory-cohorts",
	"/instructors",
	"/fleet/cars",
	"/fleet/expenses",
	"/personal-theory-lesson-requests",
] as const;

let adminPanelActive = false;
let selectedBranchId: string | null = null;

function isStaffAccount(): boolean {
	const accountType = loadAccountSession()?.accountType;
	return accountType === "admin" || accountType === "super_admin";
}

function readStoredBranchId(): string | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = localStorage.getItem(ADMIN_BRANCH_FILTER_STORAGE_KEY);
		if (!raw || raw === ADMIN_BRANCH_FILTER_ALL) return null;
		return raw;
	} catch {
		return null;
	}
}

export function initAdminBranchFilterFromStorage(): void {
	selectedBranchId = readStoredBranchId();
}

export function setAdminPanelActive(active: boolean): void {
	adminPanelActive = active;
	if (active) {
		initAdminBranchFilterFromStorage();
	}
}

export function getAdminBranchFilterId(): string | null {
	return selectedBranchId;
}

export function getAdminBranchFilterRevision(): number {
	return selectedBranchId ? Number(selectedBranchId) : 0;
}

export function setAdminBranchFilterId(id: string | null): void {
	const normalized =
		!id || id === ADMIN_BRANCH_FILTER_ALL ? null : String(id).trim() || null;
	if (normalized === selectedBranchId) return;
	selectedBranchId = normalized;
	if (typeof window !== "undefined") {
		try {
			localStorage.setItem(
				ADMIN_BRANCH_FILTER_STORAGE_KEY,
				normalized ?? ADMIN_BRANCH_FILTER_ALL,
			);
		} catch {
			/* ignore */
		}
		window.location.reload();
	}
}

function pathWithoutQuery(suffix: string): string {
	const path = suffix.startsWith("/") ? suffix : `/${suffix}`;
	const q = path.indexOf("?");
	return q >= 0 ? path.slice(0, q) : path;
}

/** Single booking mutations/reads should not receive the list-page branch filter query. */
function isSingleBookingResourcePath(path: string): boolean {
	return /^\/bookings\/\d+(?:\/|$)/.test(path);
}

/**
 * Instructor busy-slots must stay instructor-wide so calendars/slot pickers disable times
 * already booked under any branch (matrix cells filter by branchId on the client).
 */
function isInstructorBusySlotsPath(path: string): boolean {
	return /^\/instructors\/\d+\/busy-slots$/.test(path);
}

function queryHasScopedUserId(suffix: string): boolean {
	const q = suffix.indexOf("?");
	if (q < 0) return false;
	const params = new URLSearchParams(suffix.slice(q + 1));
	return params.has("studentUserId") || params.has("instructorUserId");
}

export function shouldAppendAdminBranchFilter(suffix: string): boolean {
	if (!adminPanelActive || !selectedBranchId || !isStaffAccount()) return false;
	if (queryHasScopedUserId(suffix)) return false;
	const path = pathWithoutQuery(suffix);
	if (path.includes("branchId=")) return false;
	if (isSingleBookingResourcePath(path)) return false;
	if (isInstructorBusySlotsPath(path)) return false;
	return BRANCH_FILTER_PATH_PREFIXES.some(
		(prefix) => path === prefix || path.startsWith(`${prefix}/`),
	);
}

export function appendAdminBranchQuery(suffix: string): string {
	if (!shouldAppendAdminBranchFilter(suffix)) return suffix;
	const sep = suffix.includes("?") ? "&" : "?";
	return `${suffix}${sep}branchId=${encodeURIComponent(selectedBranchId!)}`;
}

if (typeof window !== "undefined") {
	initAdminBranchFilterFromStorage();
}
