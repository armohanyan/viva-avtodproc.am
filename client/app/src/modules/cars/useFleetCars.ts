import { useCallback, useEffect, useMemo, useState } from "react";
import { vivaApiJson } from "src/lib/vivaApi";
import { useOptionalAdminBranchFilterRevision } from "src/modules/admin/AdminBranchFilterProvider";
import type { CarExpense, FleetCar } from "./car.types";
import { expenseMatchesMonth, sumExpenses } from "./fleet.utils";

function newId(prefix: string) {
	return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useFleetCars() {
	const branchFilterRevision = useOptionalAdminBranchFilterRevision();
	const [cars, setCars] = useState<FleetCar[]>([]);
	const [expenses, setExpenses] = useState<CarExpense[]>([]);

	const refresh = useCallback(async () => {
		try {
			const [c, ex] = await Promise.all([
				vivaApiJson<FleetCar[]>("/fleet/cars"),
				vivaApiJson<CarExpense[]>("/fleet/expenses"),
			]);
			setCars(Array.isArray(c) ? c : []);
			setExpenses(Array.isArray(ex) ? ex : []);
		} catch {
			setCars([]);
			setExpenses([]);
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh, branchFilterRevision]);

	const persistCars = useCallback((updater: (prev: FleetCar[]) => FleetCar[]) => {
		setCars((prev) => updater(prev));
	}, []);

	const persistExpenses = useCallback((updater: (prev: CarExpense[]) => CarExpense[]) => {
		setExpenses((prev) => updater(prev));
	}, []);

	const addCar = useCallback(
		async (c: Omit<FleetCar, "id">) => {
			try {
				await vivaApiJson("/fleet/cars", { method: "POST", body: c });
				await refresh();
			} catch {
				persistCars((prev) => [...prev, { ...c, id: newId("car") }]);
			}
		},
		[refresh, persistCars],
	);

	const updateCar = useCallback(
		async (id: string, patch: Partial<Omit<FleetCar, "id">>) => {
			try {
				await vivaApiJson(`/fleet/cars/${encodeURIComponent(id)}`, { method: "PATCH", body: patch });
				await refresh();
			} catch {
				persistCars((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
			}
		},
		[refresh, persistCars],
	);

	const removeCar = useCallback(
		async (id: string) => {
			try {
				await vivaApiJson(`/fleet/cars/${encodeURIComponent(id)}`, { method: "DELETE" });
				await refresh();
			} catch {
				persistExpenses((prev) => prev.filter((e) => e.carId !== id));
				persistCars((prev) => prev.filter((x) => x.id !== id));
			}
		},
		[refresh, persistCars, persistExpenses],
	);

	const addExpense = useCallback(
		async (e: Omit<CarExpense, "id">) => {
			try {
				await vivaApiJson("/fleet/expenses", { method: "POST", body: e });
				await refresh();
			} catch {
				persistExpenses((prev) => [...prev, { ...e, id: newId("exp") }]);
			}
		},
		[refresh, persistExpenses],
	);

	const updateExpense = useCallback(
		async (id: string, patch: Partial<Omit<CarExpense, "id">>) => {
			try {
				await vivaApiJson(`/fleet/expenses/${encodeURIComponent(id)}`, { method: "PATCH", body: patch });
				await refresh();
			} catch {
				persistExpenses((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
			}
		},
		[refresh, persistExpenses],
	);

	const removeExpense = useCallback(
		async (id: string) => {
			try {
				await vivaApiJson(`/fleet/expenses/${encodeURIComponent(id)}`, { method: "DELETE" });
				await refresh();
			} catch {
				persistExpenses((prev) => prev.filter((x) => x.id !== id));
			}
		},
		[refresh, persistExpenses],
	);

	const expensesForCar = useCallback(
		(carId: string, month: string | null) =>
			expenses.filter((e) => e.carId === carId && expenseMatchesMonth(e.date, month)),
		[expenses],
	);

	const totalForCar = useCallback(
		(carId: string, month: string | null) => sumExpenses(expensesForCar(carId, month)),
		[expensesForCar],
	);

	const totalsAllTimeByCar = useMemo(() => {
		const m = new Map<string, number>();
		for (const e of expenses) {
			m.set(e.carId, (m.get(e.carId) ?? 0) + e.amount);
		}
		return m;
	}, [expenses]);

	return {
		cars,
		expenses,
		addCar,
		updateCar,
		removeCar,
		addExpense,
		updateExpense,
		removeExpense,
		expensesForCar,
		totalForCar,
		totalsAllTimeByCar,
		refresh,
	};
}
