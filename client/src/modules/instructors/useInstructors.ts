import { useCallback, useEffect, useState } from "react";
import type { Instructor } from "src/data/instructors";
import { vivaApiJson } from "src/lib/vivaApi";

export function useInstructors() {
	const [instructors, setInstructors] = useState<Instructor[]>([]);
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		try {
			const data = await vivaApiJson<Instructor[]>("/instructors");
			setInstructors(
				Array.isArray(data)
					? data.map((ins) => ({
							...ins,
							id: String(ins.id),
							availableBranchIds: (ins.availableBranchIds ?? []).map(String),
						}))
					: [],
			);
		} catch {
			setInstructors([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	return { instructors, loading, refresh, setInstructors };
}
