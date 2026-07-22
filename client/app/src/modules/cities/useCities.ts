import { useCallback, useEffect, useState } from "react";
import { vivaApiJson } from "src/lib/vivaApi";
import type { City } from "./city.types";

export function cityNameById(cities: readonly City[], id: string): string {
	const want = String(id);
	return cities.find((c) => String(c.id) === want)?.name ?? id;
}

/** One option per city name (keeps the first id when duplicates exist). */
export function uniqueCitiesByName(cities: readonly City[]): City[] {
	const seen = new Set<string>();
	return cities.filter((c) => {
		const key = c.name.trim().toLowerCase();
		if (!key || seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

export function useCities() {
	const [cities, setCities] = useState<City[]>([]);
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		try {
			const data = await vivaApiJson<City[]>("/cities");
			setCities(
				Array.isArray(data)
					? data.map((c) => ({
							...c,
							id: String(c.id),
						}))
					: [],
			);
		} catch {
			setCities([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const addCity = useCallback(
		async (c: Omit<City, "id">): Promise<string> => {
			const created = await vivaApiJson<{ id: string | number; name: string }>("/cities", {
				method: "POST",
				body: { name: c.name },
			});
			await refresh();
			return String(created.id);
		},
		[refresh],
	);

	const updateCity = useCallback(
		async (id: string, patch: Partial<Omit<City, "id">>) => {
			await vivaApiJson(`/cities/${encodeURIComponent(id)}`, { method: "PATCH", body: patch });
			await refresh();
		},
		[refresh],
	);

	const removeCity = useCallback(
		async (id: string) => {
			await vivaApiJson(`/cities/${encodeURIComponent(id)}`, { method: "DELETE" });
			await refresh();
		},
		[refresh],
	);

	const setCitiesReplace = useCallback(
		async (next: City[]) => {
			for (const c of next) {
				try {
					await vivaApiJson("/cities", { method: "POST", body: { id: c.id, name: c.name } });
				} catch {
					await vivaApiJson(`/cities/${encodeURIComponent(c.id)}`, { method: "PATCH", body: { name: c.name } });
				}
			}
			await refresh();
		},
		[refresh],
	);

	return { cities, loading, addCity, updateCity, removeCity, setCities: setCitiesReplace, refresh };
}
