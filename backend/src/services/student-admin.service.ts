import { Package, StudentProfile, User } from '../models';
import InstructorStudentRatingService from './instructor-student-rating.service';

type ProfileJoined = StudentProfile & {
  studentAccount: User;
  package: Package;
  assignedInstructor: User | null;
};

export type AdminStudentRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  instructor: string;
  package: string;
  lessons: string;
  status: string;
  joinedIso: string;
  branchId: string;
  skillRating: number;
  licenseAchieved: boolean;
};

export default class StudentAdminService {
  static async list(): Promise<AdminStudentRow[]> {
    const rows = await StudentProfile.findAll({
      include: [
        { model: User, as: 'studentAccount', required: true },
        { model: Package, as: 'package', required: true },
        { model: User, as: 'assignedInstructor', required: false },
      ],
      order: [['joinedAt', 'DESC']],
    });

    return rows
      .map((sp) => {
        const row = sp as ProfileJoined;
        const stu = row.studentAccount;
        const pkg = row.package;
        const inst = row.assignedInstructor;
        if (!stu || !pkg) return null;
        return {
          id: stu.id,
          name: stu.name,
          email: stu.email,
          phone: stu.phone ?? '',
          instructor: inst?.name ?? '',
          package: pkg.name,
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

  static async create(input: {
    id?: string;
    name: string;
    email: string;
    phone?: string;
    branchId: string;
    packageId: string;
    instructorUserId?: string | null;
    lessonsCompleted?: number;
    lessonsTotal?: number;
    enrollmentStatus?: string;
    skillRating?: number;
    licenseAchieved?: boolean;
    joinedIso?: string;
  }): Promise<AdminStudentRow | null> {
    const email = input.email.trim().toLowerCase();
    const id =
      input.id?.trim() ||
      `USR-${String((await User.count({ where: { accountType: 'student' } })) + 1).padStart(3, '0')}`;
    await User.create({
      id,
      email,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      accountType: 'student',
      passwordHash: null,
    });
    const pkg = await Package.findByPk(input.packageId);
    if (!pkg) {
      await User.destroy({ where: { id } });
      return null;
    }
    await StudentProfile.create({
      userId: id,
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
    return list.find((r) => r.id === id) ?? null;
  }

  static async update(
    userId: string,
    patch: Partial<{
      name: string;
      email: string;
      phone: string | null;
      branchId: string;
      packageId: string;
      instructorUserId: string | null;
      lessonsCompleted: number;
      lessonsTotal: number;
      enrollmentStatus: string;
      skillRating: number;
      licenseAchieved: boolean;
      joinedIso: string;
    }>,
  ): Promise<AdminStudentRow | null> {
    const user = await User.findByPk(userId);
    const profile = await StudentProfile.findByPk(userId);
    if (!user || !profile) return null;
    if (patch.name !== undefined || patch.email !== undefined || patch.phone !== undefined) {
      await user.update({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.email !== undefined ? { email: patch.email.trim().toLowerCase() } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      });
    }
    await profile.update({
      ...(patch.branchId !== undefined ? { branchId: patch.branchId } : {}),
      ...(patch.packageId !== undefined ? { packageId: patch.packageId } : {}),
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

  static async remove(userId: string): Promise<boolean> {
    await InstructorStudentRatingService.removeAllForStudent(userId);
    const p = await StudentProfile.destroy({ where: { userId } });
    const u = await User.destroy({ where: { id: userId } });
    return p > 0 && u > 0;
  }
}
