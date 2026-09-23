import { vivaApiJson } from "src/lib/vivaApi";
import type { PaginatedList } from "src/types/pagination.types";

const INTERNAL_NO_LOGIN_EMAIL_DOMAIN = "no-login.local";

export function displayStudentEmail(email: string): string {
  const value = (email ?? "").trim();
  return value.toLowerCase().endsWith(`@${INTERNAL_NO_LOGIN_EMAIL_DOMAIN}`) ? "" : value;
}

export type AdminStudentListItem = {
  id: string;
  name: string;
  email: string;
  phone: string;
  phone2: string;
  instructor: string;
  package: string;
  lessons: string;
  status: string;
  /** YYYY-MM-DD */
  joinedIso: string;
  branchId: string;
  /** 0-10, where 0 means complete beginner */
  skillRating: number;
  licenseAchieved: boolean;
  /** Show "Invite student" only when true (no password / OAuth yet, real email). */
  inviteEligible?: boolean;
};

type AdminStudentApiRow = {
  id: number | string;
  name: string;
  email: string;
  phone?: string | null;
  phone2?: string | null;
  instructor?: string | null;
  package?: string | null;
  lessons?: string | null;
  status?: string | null;
  joinedIso?: string | null;
  branchId?: number | string | null;
  skillRating?: number | null;
  licenseAchieved?: boolean | null;
  inviteEligible?: boolean;
};

export type AdminStudentListFilters = {
  search: string;
  instructor: string;
};

export const ADMIN_STUDENTS_PAGE_SIZE = 25;
/** Backend caps page size at 100. Used when exporting the filtered list. */
export const ADMIN_STUDENTS_EXPORT_PAGE_SIZE = 100;

export function normalizeAdminStudentRow(row: AdminStudentApiRow): AdminStudentListItem {
  return {
    id: String(row.id),
    name: row.name ?? "",
    email: displayStudentEmail(row.email ?? ""),
    phone: (row.phone ?? "").trim(),
    phone2: (row.phone2 ?? "").trim(),
    instructor: (row.instructor ?? "").trim(),
    package: (row.package ?? "").trim(),
    lessons: row.lessons ?? "",
    status: row.status ?? "active",
    joinedIso: row.joinedIso ?? "",
    branchId: row.branchId == null ? "" : String(row.branchId),
    skillRating: Number(row.skillRating ?? 0),
    licenseAchieved: Boolean(row.licenseAchieved),
    inviteEligible: row.inviteEligible,
  };
}

function buildAdminStudentsQuery(page: number, pageSize: number, filters: AdminStudentListFilters): string {
  const qs = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const search = filters.search.trim();
  if (search) qs.set("search", search);
  const instructor = filters.instructor.trim();
  if (instructor && instructor !== "all") qs.set("instructor", instructor);
  return qs.toString();
}

function rowMatchesFilters(row: AdminStudentListItem, filters: AdminStudentListFilters): boolean {
  const instructor = filters.instructor.trim();
  if (instructor && instructor !== "all" && row.instructor !== instructor) return false;
  const q = filters.search.trim().toLowerCase();
  if (!q) return true;
  const hay = [row.id, row.name, row.email, row.phone, row.phone2, row.instructor, row.package, row.lessons, row.status, row.joinedIso]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

/**
 * The students endpoint returns `{ items, page, pageSize, total }` when `page` is set.
 * A raw array is the unpaged list; slice it here so the table still renders.
 */
function readStudentListPayload(
  data: unknown,
  page: number,
  pageSize: number,
  filters: AdminStudentListFilters,
): PaginatedList<AdminStudentListItem> {
  if (Array.isArray(data)) {
    const matched = data
      .map((row) => normalizeAdminStudentRow(row as AdminStudentApiRow))
      .filter((row) => rowMatchesFilters(row, filters));
    const start = (page - 1) * pageSize;
    return {
      items: matched.slice(start, start + pageSize),
      page,
      pageSize,
      total: matched.length,
    };
  }
  const body = data as Partial<PaginatedList<AdminStudentApiRow>> | null;
  const items = Array.isArray(body?.items) ? body.items.map(normalizeAdminStudentRow) : [];
  return {
    items,
    page: body?.page ?? page,
    pageSize: body?.pageSize ?? pageSize,
    total: body?.total ?? items.length,
  };
}

export async function fetchAdminStudentsPage(
  page: number,
  pageSize: number,
  filters: AdminStudentListFilters,
): Promise<PaginatedList<AdminStudentListItem>> {
  const query = buildAdminStudentsQuery(page, pageSize, filters);
  const data = await vivaApiJson<unknown>(`/students?${query}`);
  return readStudentListPayload(data, page, pageSize, filters);
}

/** Every student matching the current search and instructor filter. */
export async function fetchAllAdminStudents(filters: AdminStudentListFilters): Promise<AdminStudentListItem[]> {
  const all: AdminStudentListItem[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const data = await fetchAdminStudentsPage(page, ADMIN_STUDENTS_EXPORT_PAGE_SIZE, filters);
    all.push(...data.items);
    const pageSize = data.pageSize || ADMIN_STUDENTS_EXPORT_PAGE_SIZE;
    totalPages = Math.max(1, Math.ceil((data.total ?? 0) / pageSize));
    if (data.items.length === 0) break;
    page += 1;
  }

  return all;
}
