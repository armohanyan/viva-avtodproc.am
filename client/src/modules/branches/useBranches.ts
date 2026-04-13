import { useCallback, useEffect, useState } from "react";
import { vivaApiJson } from "src/lib/vivaApi";
import type { Branch } from "./branch.types";

function newId() {
	return `br-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useBranches() {
	const [branches, setBranches] = useState<Branch[]>([]);
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		try {
			const data = await vivaApiJson<Branch[]>("/branches");
			setBranches(Array.isArray(data) ? data : []);
		} catch {
			setBranches([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const addBranch = useCallback(
		async (b: Omit<Branch, "id">) => {
			const id = newId();
			await vivaApiJson("/branches", {
				method: "POST",
				body: {
					id,
					cityId: b.cityId,
					name: b.name,
					mapUrl: b.mapUrl,
					phone: b.phone,
					email: b.email,
					workHours: b.workHours,
				},
			});
			await refresh();
		},
		[refresh],
	);

	const updateBranch = useCallback(
		async (id: string, patch: Partial<Omit<Branch, "id">>) => {
			await vivaApiJson(`/branches/${encodeURIComponent(id)}`, { method: "PATCH", body: patch });
			await refresh();
		},
		[refresh],
	);

	const removeBranch = useCallback(
		async (id: string) => {
			await vivaApiJson(`/branches/${encodeURIComponent(id)}`, { method: "DELETE" });
			await refresh();
		},
		[refresh],
	);

	const setBranchesReplace = useCallback(
		async (next: Branch[]) => {
			for (const b of next) {
				try {
					await vivaApiJson("/branches", {
						method: "POST",
						body: {
							id: b.id,
							cityId: b.cityId,
							name: b.name,
							mapUrl: b.mapUrl,
							phone: b.phone,
							email: b.email,
							workHours: b.workHours,
						},
					});
				} catch {
					await vivaApiJson(`/branches/${encodeURIComponent(b.id)}`, {
						method: "PATCH",
						body: {
							cityId: b.cityId,
							name: b.name,
							mapUrl: b.mapUrl,
							phone: b.phone,
							email: b.email,
							workHours: b.workHours,
						},
					});
				}
			}
			await refresh();
		},
		[refresh],
	);

	return { branches, loading, addBranch, updateBranch, removeBranch, setBranches: setBranchesReplace, refresh };
}

export function branchNameById(branches: readonly Branch[], id: string): string {
	return branches.find((b) => b.id === id)?.name ?? id;
}
