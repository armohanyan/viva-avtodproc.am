import type { CarExpense } from "./car.types";

/** `yearMonth` is YYYY-MM from `<input type="month" />`, or null for all time */
export function expenseMatchesMonth(dateStr: string, yearMonth: string | null): boolean {
  if (!yearMonth) return true;
  return dateStr.slice(0, 7) === yearMonth;
}

export function sumExpenses(expenses: readonly CarExpense[]): number {
  return expenses.reduce((s, e) => s + e.amount, 0);
}
