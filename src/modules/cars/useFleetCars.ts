import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_FLEET_CARS } from "./cars.defaults";
import { loadCarExpenses, saveCarExpenses } from "./car-expenses.storage";
import { loadFleetCars, saveFleetCars } from "./cars.storage";
import { expenseMatchesMonth, sumExpenses } from "./fleet.utils";
import type { CarExpense, FleetCar } from "./car.types";

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useFleetCars() {
  const [cars, setCars] = useState<FleetCar[]>(() =>
    typeof window !== "undefined" ? loadFleetCars() : DEFAULT_FLEET_CARS
  );
  const [expenses, setExpenses] = useState<CarExpense[]>(() =>
    typeof window !== "undefined" ? loadCarExpenses() : []
  );

  const refresh = useCallback(() => {
    setCars(loadFleetCars());
    setExpenses(loadCarExpenses());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener("storage", handler);
    window.addEventListener("viva-fleet-updated", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("viva-fleet-updated", handler);
    };
  }, [refresh]);

  const persistCars = useCallback((updater: (prev: FleetCar[]) => FleetCar[]) => {
    setCars((prev) => {
      const next = updater(prev);
      saveFleetCars(next);
      return next;
    });
  }, []);

  const persistExpenses = useCallback((updater: (prev: CarExpense[]) => CarExpense[]) => {
    setExpenses((prev) => {
      const next = updater(prev);
      saveCarExpenses(next);
      return next;
    });
  }, []);

  const addCar = useCallback(
    (c: Omit<FleetCar, "id">) => {
      persistCars((prev) => [...prev, { ...c, id: newId("car") }]);
    },
    [persistCars]
  );

  const updateCar = useCallback(
    (id: string, patch: Partial<Omit<FleetCar, "id">>) => {
      persistCars((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    },
    [persistCars]
  );

  const removeCar = useCallback(
    (id: string) => {
      persistExpenses((prev) => prev.filter((e) => e.carId !== id));
      persistCars((prev) => prev.filter((x) => x.id !== id));
    },
    [persistCars, persistExpenses]
  );

  const addExpense = useCallback(
    (e: Omit<CarExpense, "id">) => {
      persistExpenses((prev) => [...prev, { ...e, id: newId("exp") }]);
    },
    [persistExpenses]
  );

  const updateExpense = useCallback(
    (id: string, patch: Partial<Omit<CarExpense, "id">>) => {
      persistExpenses((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    },
    [persistExpenses]
  );

  const removeExpense = useCallback(
    (id: string) => {
      persistExpenses((prev) => prev.filter((x) => x.id !== id));
    },
    [persistExpenses]
  );

  const expensesForCar = useCallback(
    (carId: string, month: string | null) =>
      expenses.filter((e) => e.carId === carId && expenseMatchesMonth(e.date, month)),
    [expenses]
  );

  const totalForCar = useCallback(
    (carId: string, month: string | null) => sumExpenses(expensesForCar(carId, month)),
    [expensesForCar]
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
  };
}
