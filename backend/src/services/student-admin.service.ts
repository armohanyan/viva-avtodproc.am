import { Package, StudentProfile, User } from '../models';
import InstructorStudentRatingService from './instructor-student-rating.service';

type ProfileJoined = StudentProfile & {
  studentAccount: User;
  package: Package;
  assignedInstructor: User | null;
};

export type AdminStudentRow = {
  id: number;
  name: string;
  email: string;
  phone: string;
  instructor: string;
  package: string;
  lessons: string;
  status: string;
  joinedIso: string;
  branchId: number;
  skillRating: number;
  licenseAchieved: boolean;
};

export default class StudentAdminService {
  private static mapProfileRows(rows: StudentProfile[]): AdminStudentRow[] {
    return rows
      .map((sp) => {
        const row = sp as ProfileJoined;
        const stu = row.studentAccount;
        const pkg = row.package;
        const inst = row.assignedInstructor;
        if (!stu) return null;
        return {
          id: stu.id,
          name: stu.name,
          email: stu.email,
          phone: stu.phone ?? '',
          instructor: inst?.name ?? '',
          package: pkg?.name ?? '',
          lessons: `${sp.lessonsCompleted}/${sp.lessonsTotal}`,
          status: sp.enrollmentStatus,
          joinedIso: typeof sp.joinedAt === 'string' ? sp.joinedAt : String(sp.joinedAt),
          branchId: sp.branchId,
          skillRating: sp.skillRating,
          licenseAchieved: sp.licenseAchieved,
        };
      })
      .filter((row): row is AdminStudentRow => row != null);
  }

  static async list(): Promise<AdminStudentRow[]> {
    const rows = await StudentProfile.findAll({
      include: [
        { model: User, as: 'studentAccount', required: true },
        { model: Package, as: 'package', required: false },
        { model: User, as: 'assignedInstructor', required: false },
      ],
      order: [['joinedAt', 'DESC']],
    });
    return this.mapProfileRows(rows);
  }

  /** Students assigned to this instructor (`student_profiles.instructor_user_id`). */
  static async listForInstructor(instructorUserId: number): Promise<AdminStudentRow[]> {
    const rows = await StudentProfile.findAll({
      where: { instructorUserId },
      include: [
        { model: User, as: 'studentAccount', required: true },
        { model: Package, as: 'package', required: false },
        { model: User, as: 'assignedInstructor', required: false },
      ],
      order: [['joinedAt', 'DESC']],
    });
    return this.mapProfileRows(rows);
  }

  static async patchByAssignedInstructor(
    instructorUserId: number,
    studentUserId: number,
    patch: { skillRating?: number; licenseAchieved?: boolean },
  ): Promise<AdminStudentRow | null> {
    const profile = await StudentProfile.findOne({
      where: { userId: studentUserId, instructorUserId },
    });
    if (!profile) return null;

    const updates: Partial<{
      skillRating: number;
      licenseAchieved: boolean;
      enrollmentStatus: string;
    }> = {};

    if (patch.skillRating !== undefined) {
      const r = Math.round(patch.skillRating);
      updates.skillRating = Math.max(0, Math.min(10, r));
    }
    if (patch.licenseAchieved !== undefined) {
      updates.licenseAchieved = patch.licenseAchieved;
      if (patch.licenseAchieved) {
        updates.enrollmentStatus = 'completed';
      } else if (profile.enrollmentStatus === 'completed') {
        updates.enrollmentStatus = 'active';
      }
    }

    if (Object.keys(updates).length === 0) {
      const list = await this.listForInstructor(instructorUserId);
      return list.find((r) => r.id === studentUserId) ?? null;
    }

    await profile.update(updates);
    const list = await this.listForInstructor(instructorUserId);
    return list.find((r) => r.id === studentUserId) ?? null;
  }

  static async create(input: {
    name: string;
    email: string;
    phone?: string;
    branchId: number;
    packageId: number;
    instructorUserId?: number | null;
    lessonsCompleted?: number;
    lessonsTotal?: number;
    enrollmentStatus?: string;
    skillRating?: number;
    licenseAchieved?: boolean;
    joinedIso?: string;
  }): Promise<AdminStudentRow | null> {
    const email = input.email.trim().toLowerCase();
    const user = await User.create({
      email,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      accountType: 'student',
      passwordHash: null,
    });
    const pkg = await Package.findByPk(input.packageId);
    if (!pkg) {
      await User.destroy({ where: { id: user.id } });
      return null;
    }
    await StudentProfile.create({
      userId: user.id,
      branchId: input.branchId,
      packageId: input.packageId,
      instructorUserId: input.instructorUserId ?? null,
      lessonsCompleted: input.lessonsCompleted ?? 0,
      lessonsTotal: input.lessonsTotal ?? pkg.lessons,
      enrollmentStatus: input.enrollmentStatus ?? 'active',
      skillRating: input.skillRating ?? 0,
      licenseAchieved: input.licenseAchieved ?? false,
      joinedAt: input.joinedIso ?? new Date().toISOString().slice(0, 10),
    });
    const list = await this.list();
    return list.find((r) => r.id === user.id) ?? null;
  }

  static async update(
    userId: number,
    patch: Partial<{
      name: string;
      email: string;
      phone: string | null;
      branchId: number;
      packageId: number | null;
      instructorUserId: number | null;
      lessonsCompleted: number;
      lessonsTotal: number;
      enrollmentStatus: string;
      skillRating: number;
      licenseAchieved: boolean;
      joinedIso: string;
    }>,
  ): Promise<AdminStudentRow | null> {
    const user = await User.findByPk(userId);
    const profile = await StudentProfile.findOne({ where: { userId } });
    if (!user || !profile) return null;
    if (patch.name !== undefined || patch.email !== undefined || patch.phone !== undefined) {
      await user.update({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.email !== undefined ? { email: patch.email.trim().toLowerCase() } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      });
    }
    let nextPackageId: number | null | undefined;
    if (patch.packageId !== undefined) {
      if (patch.packageId === null) {
        nextPackageId = null;
      } else {
        const pkg = await Package.findByPk(patch.packageId);
        if (!pkg) return null;
        nextPackageId = patch.packageId;
      }
    }
    await profile.update({
      ...(patch.branchId !== undefined ? { branchId: patch.branchId } : {}),
      ...(nextPackageId !== undefined ? { packageId: nextPackageId } : {}),
      ...(patch.instructorUserId !== undefined ? { instructorUserId: patch.instructorUserId } : {}),
      ...(patch.lessonsCompleted !== undefined ? { lessonsCompleted: patch.lessonsCompleted } : {}),
      ...(patch.lessonsTotal !== undefined ? { lessonsTotal: patch.lessonsTotal } : {}),
      ...(patch.enrollmentStatus !== undefined ? { enrollmentStatus: patch.enrollmentStatus } : {}),
      ...(patch.skillRating !== undefined ? { skillRating: patch.skillRating } : {}),
      ...(patch.licenseAchieved !== undefined ? { licenseAchieved: patch.licenseAchieved } : {}),
      ...(patch.joinedIso !== undefined ? { joinedAt: patch.joinedIso } : {}),
    });
    const list = await this.list();
    return list.find((r) => r.id === userId) ?? null;
  }

  static async remove(userId: number): Promise<boolean> {
    await InstructorStudentRatingService.removeAllForStudent(userId);
    const p = await StudentProfile.destroy({ where: { userId } });
    const u = await User.destroy({ where: { id: userId } });
    return p > 0 && u > 0;
  }
}
