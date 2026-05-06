import { useCallback, useEffect, useState } from "react";
import type { Instructor } from "src/data/instructors";
import { sameOriginStaffUploadUrl } from "src/lib/sameOriginStaffUploadUrl";
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
							imageSrc: sameOriginStaffUploadUrl(ins.imageSrc ?? null) ?? ins.imageSrc ?? "/logo.svg",
							availableBranchIds: (ins.availableBranchIds ?? []).map(String),
							fleetCarIds: Array.isArray(ins.fleetCarIds) ? ins.fleetCarIds : [],
							...(typeof ins.inviteEligible === "boolean" ? { inviteEligible: ins.inviteEligible } : {}),
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
