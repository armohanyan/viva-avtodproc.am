import { vivaApiJson } from "src/lib/vivaApi";
import { fetchDirectorDashboard, fetchDirectorMonthlyReport } from "src/modules/director/director.api";
import type { AdminReportsBundle, FinancialReportResponse } from "./adminReports.types";

export function adminReportsQuery(start: string, end: string, branchId?: string | null): string {
  const params = new URLSearchParams({ startDate: start, endDate: end });
  if (branchId) params.set("branchId", branchId);
  return params.toString();
}

export async function fetchAdminFinancialReport(q: string): Promise<FinancialReportResponse> {
  return vivaApiJson<FinancialReportResponse>(`/admin/reports/financial?${q}`);
}

type LeadRow = { createdAt?: string; status?: string };

function countLeadsInRange(rows: LeadRow[], start: string, end: string): number {
  return rows.filter((r) => {
    const d = r.createdAt?.slice(0, 10);
    return d != null && d >= start && d <= end;
  }).length;
}

export async function fetchAdminReportsBundle(
  q: string,
  start: string,
  end: string,
  includeDirector: boolean,
): Promise<AdminReportsBundle> {
  const [financial, contactRows, callRows, director, monthlyTrend] = await Promise.all([
    fetchAdminFinancialReport(q),
    vivaApiJson<LeadRow[]>("/contact-requests").catch(() => [] as LeadRow[]),
    vivaApiJson<LeadRow[]>("/booked-calls").catch(() => [] as LeadRow[]),
    includeDirector ? fetchDirectorDashboard(q) : Promise.resolve(undefined),
    includeDirector ? fetchDirectorMonthlyReport(q) : Promise.resolve(undefined),
  ]);

  return {
    financial,
    leads: {
      contactRequests: countLeadsInRange(Array.isArray(contactRows) ? contactRows : [], start, end),
      bookedCalls: countLeadsInRange(Array.isArray(callRows) ? callRows : [], start, end),
    },
    ...(director ? { director } : {}),
    ...(monthlyTrend ? { monthlyTrend } : {}),
  };
}
