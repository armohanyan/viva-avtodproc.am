import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "src/lib/api";
import { vivaApiJson } from "src/lib/vivaApi";
import { useOptionalAdminBranchFilterRevision } from "src/modules/admin/AdminBranchFilterProvider";

export type AdminStudentMini = { id: string; name: string; email: string; phone: string };

type StudentRow = {
	id: string;
	name: string;
	email: string;
	phone?: string | null;
	status?: string;
};

export type UseAdminStudentsMiniOptions = {
	/**
	 * Enrollment status filter from the student profile.
	 * `"active"` limits pickers to active (ակտիվ) students; `"all"` returns every row from the API.
	 */
	enrollmentStatus?: "active" | "all";
};

export function useAdminStudentsMini(options: UseAdminStudentsMiniOptions = {}) {
	const branchFilterRevision = useOptionalAdminBranchFilterRevision();
	const { enrollmentStatus = "active" } = options;
	const [students, setStudents] = useState<AdminStudentMini[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await vivaApiJson<StudentRow[]>("/students");
			const rows = Array.isArray(data) ? data : [];
			const mapped = rows
				.filter((r) => enrollmentStatus === "all" || (r.status ?? "active") === "active")
				.map((r) => ({ id: r.id, name: r.name, email: r.email, phone: (r.phone ?? "").trim() }));
			setStudents(mapped);
		} catch (e) {
			setStudents([]);
			setError(getApiErrorMessage(e));
		} finally {
			setLoading(false);
		}
	}, [enrollmentStatus]);

	useEffect(() => {
		void refresh();
	}, [refresh, branchFilterRevision]);

	return { students, loading, error, refresh };
}
