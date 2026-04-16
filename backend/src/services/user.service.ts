import StudentAdminService from './student-admin.service';

/** @deprecated Use GET /students — kept for legacy `/user` route. */
export default class UserService {
  static async listUsers() {
    return StudentAdminService.list();
  }

  static async addUser(body: unknown) {
    const o = body as Record<string, unknown>;
    return StudentAdminService.create({
      name: String(o.name ?? ''),
      email: String(o.email ?? ''),
      phone: o.phone != null ? String(o.phone) : undefined,
      branchId: Number(o.branchId ?? 0),
      packageId: Number(o.packageId ?? 0),
      instructorUserId:
        o.instructorUserId != null && o.instructorUserId !== ''
          ? Number(o.instructorUserId)
          : null,
    });
  }
}
