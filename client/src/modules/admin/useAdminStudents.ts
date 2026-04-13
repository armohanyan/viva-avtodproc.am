import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "src/lib/api";
import { vivaApiJson } from "src/lib/vivaApi";

export type AdminStudentMini = { id: string; name: string; email: string };

type StudentRow = {
	id: string;
	name: string;
	email: string;
};

export function useAdminStudentsMini() {
	const [students, setStudents] = useState<AdminStudentMini[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await vivaApiJson<StudentRow[]>("/students");
			setStudents(
				Array.isArray(data)
					? data.map((r) => ({ id: r.id, name: r.name, email: r.email }))
					: [],
			);
		} catch (e) {
			setStudents([]);
			setError(getApiErrorMessage(e));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	return { students, loading, error, refresh };
}
