import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "src/lib/api";
import { vivaApiJson } from "src/lib/vivaApi";
import { useOptionalAdminBranchFilterRevision } from "src/modules/admin/AdminBranchFilterProvider";

export type AdminStudentMini = { id: string; name: string; email: string; phone: string; phone2: string };

type StudentRow = {
	id: string;
	name: string;
	email: string;
	phone?: string | null;
	phone2?: string | null;
	status?: string;
};

export type UseAdminStudentsMiniOptions = {
	/**
	 * Enrollment status filter from the student profile.
	 * `"active"` limits pickers to active (ակտիվ) students; `"all"` returns every row from the API.
	 */
	enrollmentStatus?: "active" | "all";
	/** When false, skips the network request until enabled (e.g. booking modal closed). */
	enabled?: boolean;
};

export function useAdminStudentsMini(options: UseAdminStudentsMiniOptions = {}) {
	const branchFilterRevision = useOptionalAdminBranchFilterRevision();
	const { enrollmentStatus = "active", enabled = true } = options;
	const [students, setStudents] = useState<AdminStudentMini[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		if (!enabled) {
			setStudents([]);
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const data = await vivaApiJson<StudentRow[]>("/students");
			const rows = Array.isArray(data) ? data : [];
			const mapped = rows
				.filter((r) => enrollmentStatus === "all" || (r.status ?? "active") === "active")
				.map((r) => ({
					id: r.id,
					name: r.name,
					email: r.email,
					phone: (r.phone ?? "").trim(),
					phone2: (r.phone2 ?? "").trim(),
				}));
			setStudents(mapped);
		} catch (e) {
			setStudents([]);
			setError(getApiErrorMessage(e));
		} finally {
			setLoading(false);
		}
	}, [enrollmentStatus, enabled]);

	useEffect(() => {
		void refresh();
	}, [refresh, branchFilterRevision]);

	return { students, loading, error, refresh };
}
