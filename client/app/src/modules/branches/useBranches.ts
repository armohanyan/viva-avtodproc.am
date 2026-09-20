import { useCallback, useEffect, useState } from "react";
import { vivaApiJson } from "src/lib/vivaApi";
import type { Branch } from "./branch.types";

function mapBranch(b: Branch): Branch {
	return {
		...b,
		id: String(b.id),
		cityId: String(b.cityId),
		label: b.label ?? undefined,
		phone: b.phone ?? undefined,
		email: b.email ?? undefined,
		workHours: b.workHours ?? undefined,
	};
}

/** Empty / whitespace contact fields are stored as null so clears persist. */
function contactOrNull(value: string | null | undefined): string | null {
	if (value == null) return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

function newId() {
	return `br-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useBranches() {
	const [branches, setBranches] = useState<Branch[]>([]);
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		try {
			const data = await vivaApiJson<Branch[]>("/branches", { cache: "no-store" });
			setBranches(Array.isArray(data) ? data.map(mapBranch) : []);
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
			const created = await vivaApiJson<Branch>("/branches", {
				method: "POST",
				body: {
					id,
					cityId: b.cityId,
					name: b.name,
					mapUrl: b.mapUrl,
					label: contactOrNull(b.label),
					phone: contactOrNull(b.phone),
					email: contactOrNull(b.email),
					workHours: contactOrNull(b.workHours),
				},
			});
			if (created && typeof created === "object" && "id" in created) {
				const mapped = mapBranch(created);
				setBranches((prev) => {
					const without = prev.filter((row) => row.id !== mapped.id);
					return [...without, mapped].sort((a, c) => a.name.localeCompare(c.name));
				});
			}
			await refresh();
			return created ? mapBranch(created) : undefined;
		},
		[refresh],
	);

	const updateBranch = useCallback(
		async (id: string, patch: Partial<Omit<Branch, "id">>) => {
			const body: Record<string, unknown> = { ...patch };
			if ("label" in patch) body.label = contactOrNull(patch.label);
			if ("phone" in patch) body.phone = contactOrNull(patch.phone);
			if ("email" in patch) body.email = contactOrNull(patch.email);
			if ("workHours" in patch) body.workHours = contactOrNull(patch.workHours);

			const updated = await vivaApiJson<Branch>(`/branches/${encodeURIComponent(id)}`, {
				method: "PATCH",
				body,
			});
			if (updated && typeof updated === "object" && "id" in updated) {
				const mapped = mapBranch(updated);
				setBranches((prev) => prev.map((row) => (row.id === String(id) ? mapped : row)));
			}
			await refresh();
			return updated ? mapBranch(updated) : undefined;
		},
		[refresh],
	);

	const removeBranch = useCallback(
		async (id: string) => {
			await vivaApiJson(`/branches/${encodeURIComponent(id)}`, { method: "DELETE" });
			setBranches((prev) => prev.filter((row) => row.id !== String(id)));
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
							label: contactOrNull(b.label),
							phone: contactOrNull(b.phone),
							email: contactOrNull(b.email),
							workHours: contactOrNull(b.workHours),
						},
					});
				} catch {
					await vivaApiJson(`/branches/${encodeURIComponent(b.id)}`, {
						method: "PATCH",
						body: {
							cityId: b.cityId,
							name: b.name,
							mapUrl: b.mapUrl,
							label: contactOrNull(b.label),
							phone: contactOrNull(b.phone),
							email: contactOrNull(b.email),
							workHours: contactOrNull(b.workHours),
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
	const want = String(id);
	return branches.find((b) => String(b.id) === want)?.name ?? id;
}
