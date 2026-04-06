import type { CarExpense } from "./car.types";

const STORAGE_KEY = "viva-car-expenses-v1";

export function loadCarExpenses(): CarExpense[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CarExpense[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((e) => ({
      ...e,
      id: String(e.id),
      carId: String(e.carId ?? ""),
      amount: Math.max(0, Number(e.amount) || 0),
      date: String(e.date ?? "").slice(0, 10),
      purpose: String(e.purpose ?? ""),
      note: e.note != null ? String(e.note) : undefined,
    }));
  } catch {
    return [];
  }
}

export function saveCarExpenses(expenses: CarExpense[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  window.dispatchEvent(new CustomEvent("viva-fleet-updated"));
}
