import { vivaApiJson } from "src/lib/vivaApi";
import type {
  DirectorCashEntry,
  DirectorDashboard,
  DirectorMonthlyReport,
  DirectorDriverProfile,
  DirectorExpense,
  DirectorFuel,
  DirectorInstructorHours,
  DirectorKm,
  DirectorOptionCategory,
  DirectorRepair,
  DirectorRevenue,
  DirectorSalary,
  DirectorChartPoint,
} from "./director.types";

const BASE = "/admin/director";

function apiNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeDirectorFuel(row: DirectorFuel): DirectorFuel {
  return { ...row, liters: apiNumber(row.liters), amount: apiNumber(row.amount) };
}

function normalizeDirectorKm(row: DirectorKm): DirectorKm {
  return { ...row, km: apiNumber(row.km) };
}

export async function fetchDirectorOptions(category: DirectorOptionCategory): Promise<string[]> {
  return vivaApiJson<string[]>(`${BASE}/options/${category}`);
}

export async function addDirectorOption(category: DirectorOptionCategory, value: string): Promise<string[]> {
  return vivaApiJson<string[]>(`${BASE}/options/${category}`, { method: "POST", body: { value } });
}

export async function fetchDirectorDashboard(q: string): Promise<DirectorDashboard> {
  return vivaApiJson<DirectorDashboard>(`${BASE}/dashboard?${q}`);
}

export async function fetchDirectorMonthlyReport(q: string): Promise<DirectorMonthlyReport> {
  return vivaApiJson<DirectorMonthlyReport>(`${BASE}/reports/monthly?${q}`);
}

export async function fetchDirectorCash(q: string): Promise<DirectorCashEntry[]> {
  return vivaApiJson<DirectorCashEntry[]>(`${BASE}/cash?${q}`);
}

export async function createDirectorCash(body: Omit<DirectorCashEntry, "id">): Promise<DirectorCashEntry> {
  return vivaApiJson<DirectorCashEntry>(`${BASE}/cash`, { method: "POST", body });
}

export async function updateDirectorCash(id: number, body: Omit<DirectorCashEntry, "id">): Promise<DirectorCashEntry> {
  return vivaApiJson<DirectorCashEntry>(`${BASE}/cash/${id}`, { method: "PATCH", body });
}

export async function deleteDirectorCash(id: number): Promise<void> {
  await vivaApiJson(`${BASE}/cash/${id}`, { method: "DELETE" });
}

export async function fetchDirectorExpenses(q: string): Promise<DirectorExpense[]> {
  return vivaApiJson<DirectorExpense[]>(`${BASE}/expenses?${q}`);
}

export async function fetchDirectorExpenseChart(q: string): Promise<DirectorChartPoint[]> {
  return vivaApiJson<DirectorChartPoint[]>(`${BASE}/expenses/chart?${q}`);
}

export async function createDirectorExpense(body: Omit<DirectorExpense, "id">): Promise<DirectorExpense> {
  return vivaApiJson<DirectorExpense>(`${BASE}/expenses`, { method: "POST", body });
}

export async function updateDirectorExpense(id: number, body: Omit<DirectorExpense, "id">): Promise<DirectorExpense> {
  return vivaApiJson<DirectorExpense>(`${BASE}/expenses/${id}`, { method: "PATCH", body });
}

export async function deleteDirectorExpense(id: number): Promise<void> {
  await vivaApiJson(`${BASE}/expenses/${id}`, { method: "DELETE" });
}

export async function fetchDirectorRepairs(q: string): Promise<DirectorRepair[]> {
  return vivaApiJson<DirectorRepair[]>(`${BASE}/repairs?${q}`);
}

export async function createDirectorRepair(body: Omit<DirectorRepair, "id">): Promise<DirectorRepair> {
  return vivaApiJson<DirectorRepair>(`${BASE}/repairs`, { method: "POST", body });
}

export async function updateDirectorRepair(id: number, body: Omit<DirectorRepair, "id">): Promise<DirectorRepair> {
  return vivaApiJson<DirectorRepair>(`${BASE}/repairs/${id}`, { method: "PATCH", body });
}

export async function deleteDirectorRepair(id: number): Promise<void> {
  await vivaApiJson(`${BASE}/repairs/${id}`, { method: "DELETE" });
}

export async function fetchDirectorFuel(q: string): Promise<DirectorFuel[]> {
  const rows = await vivaApiJson<DirectorFuel[]>(`${BASE}/fuel?${q}`);
  return Array.isArray(rows) ? rows.map(normalizeDirectorFuel) : [];
}

export async function createDirectorFuel(body: Omit<DirectorFuel, "id">): Promise<DirectorFuel> {
  const row = await vivaApiJson<DirectorFuel>(`${BASE}/fuel`, { method: "POST", body });
  return normalizeDirectorFuel(row);
}

export async function updateDirectorFuel(id: number, body: Omit<DirectorFuel, "id">): Promise<DirectorFuel> {
  const row = await vivaApiJson<DirectorFuel>(`${BASE}/fuel/${id}`, { method: "PATCH", body });
  return normalizeDirectorFuel(row);
}

export async function deleteDirectorFuel(id: number): Promise<void> {
  await vivaApiJson(`${BASE}/fuel/${id}`, { method: "DELETE" });
}

export async function fetchDirectorKm(q: string): Promise<DirectorKm[]> {
  const rows = await vivaApiJson<DirectorKm[]>(`${BASE}/km?${q}`);
  return Array.isArray(rows) ? rows.map(normalizeDirectorKm) : [];
}

export async function createDirectorKm(body: Omit<DirectorKm, "id">): Promise<DirectorKm> {
  const row = await vivaApiJson<DirectorKm>(`${BASE}/km`, { method: "POST", body });
  return normalizeDirectorKm(row);
}

export async function updateDirectorKm(id: number, body: Omit<DirectorKm, "id">): Promise<DirectorKm> {
  const row = await vivaApiJson<DirectorKm>(`${BASE}/km/${id}`, { method: "PATCH", body });
  return normalizeDirectorKm(row);
}

export async function deleteDirectorKm(id: number): Promise<void> {
  await vivaApiJson(`${BASE}/km/${id}`, { method: "DELETE" });
}

export async function fetchDirectorInstructorHours(q: string): Promise<DirectorInstructorHours[]> {
  return vivaApiJson<DirectorInstructorHours[]>(`${BASE}/instructor-hours?${q}`);
}

export async function createDirectorInstructorHours(
  body: Omit<DirectorInstructorHours, "id">,
): Promise<DirectorInstructorHours> {
  return vivaApiJson<DirectorInstructorHours>(`${BASE}/instructor-hours`, { method: "POST", body });
}

export async function updateDirectorInstructorHours(
  id: number,
  body: Omit<DirectorInstructorHours, "id">,
): Promise<DirectorInstructorHours> {
  return vivaApiJson<DirectorInstructorHours>(`${BASE}/instructor-hours/${id}`, { method: "PATCH", body });
}

export async function deleteDirectorInstructorHours(id: number): Promise<void> {
  await vivaApiJson(`${BASE}/instructor-hours/${id}`, { method: "DELETE" });
}

export async function fetchDirectorSalaries(q: string): Promise<DirectorSalary[]> {
  return vivaApiJson<DirectorSalary[]>(`${BASE}/salaries?${q}`);
}

export async function createDirectorSalary(body: Omit<DirectorSalary, "id">): Promise<DirectorSalary> {
  return vivaApiJson<DirectorSalary>(`${BASE}/salaries`, { method: "POST", body });
}

export async function updateDirectorSalary(id: number, body: Omit<DirectorSalary, "id">): Promise<DirectorSalary> {
  return vivaApiJson<DirectorSalary>(`${BASE}/salaries/${id}`, { method: "PATCH", body });
}

export async function deleteDirectorSalary(id: number): Promise<void> {
  await vivaApiJson(`${BASE}/salaries/${id}`, { method: "DELETE" });
}

export async function fetchDirectorRevenues(q: string, isLegacy: boolean): Promise<DirectorRevenue[]> {
  return vivaApiJson<DirectorRevenue[]>(`${BASE}/revenues?${q}&isLegacy=${isLegacy}`);
}

export async function fetchDirectorRevenueChart(q: string, isLegacy: boolean): Promise<DirectorChartPoint[]> {
  return vivaApiJson<DirectorChartPoint[]>(`${BASE}/revenues/chart?${q}&isLegacy=${isLegacy}`);
}

export async function createDirectorRevenue(body: Omit<DirectorRevenue, "id">): Promise<DirectorRevenue> {
  return vivaApiJson<DirectorRevenue>(`${BASE}/revenues`, { method: "POST", body });
}

export async function deleteDirectorRevenue(id: number): Promise<void> {
  await vivaApiJson(`${BASE}/revenues/${id}`, { method: "DELETE" });
}

export async function fetchDirectorDriverProfile(q: string, instructorUserId: number): Promise<DirectorDriverProfile> {
  return vivaApiJson<DirectorDriverProfile>(
    `${BASE}/driver-profile?${q}&instructorUserId=${encodeURIComponent(String(instructorUserId))}`,
  );
}
