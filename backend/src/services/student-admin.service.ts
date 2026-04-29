import { Op } from 'sequelize';
import { Package, StudentProfile, User } from '../models';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';
import InstructorStudentRatingService from './instructor-student-rating.service';

const { ConflictError } = ErrorsUtil;
const { InputValidationError } = ErrorsUtil;
const INTERNAL_NO_LOGIN_EMAIL_DOMAIN = 'no-login.local';

function isInternalNoLoginEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${INTERNAL_NO_LOGIN_EMAIL_DOMAIN}`);
}

function generateInternalNoLoginEmail(seed?: number): string {
  const rand = Math.random().toString(36).slice(2, 8);
  const ts = Date.now().toString(36);
  const prefix = seed ? `student-${seed}` : 'student';
  return `${prefix}-${ts}-${rand}@${INTERNAL_NO_LOGIN_EMAIL_DOMAIN}`;
}

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
          lessons: `${sp.lessonsCompleted}/${sp.lessonsTotal} · T ${sp.theoryLessonsCompleted ?? 0}/${sp.theoryLessonsTotal ?? 0}`,
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
    email?: string;
    inviteToSystem?: boolean;
    phone?: string;
    branchId: number;
    packageId?: number | null;
    instructorUserId?: number | null;
    lessonsCompleted?: number;
    lessonsTotal?: number;
    theoryLessonsCompleted?: number;
    theoryLessonsTotal?: number;
    enrollmentStatus?: string;
    skillRating?: number;
    licenseAchieved?: boolean;
    joinedIso?: string;
  }): Promise<AdminStudentRow | null> {
    const inviteToSystem = input.inviteToSystem ?? true;
    const rawEmail = (input.email ?? '').trim().toLowerCase();
    if (inviteToSystem && !rawEmail) {
      throw new InputValidationError('Email is required when inviteToSystem is true', HttpStatusCodesUtil.BAD_REQUEST);
    }
    const email = !inviteToSystem && !rawEmail ? generateInternalNoLoginEmail() : rawEmail;
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      throw new ConflictError('Email already in use', HttpStatusCodesUtil.CONFLICT);
    }
    const user = await User.create({
      email,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      accountType: 'student',
      passwordHash: null,
    });
    const pkg = input.packageId ? await Package.findByPk(input.packageId) : null;
    if (input.packageId && !pkg) {
      await User.destroy({ where: { id: user.id } });
      return null;
    }
    const theoryTotal =
      input.theoryLessonsTotal ??
      (Number(pkg?.theoryLessons ?? 0) > 0 ? Number(pkg?.theoryLessons) : 0);
    await StudentProfile.create({
      userId: user.id,
      branchId: input.branchId,
      packageId: input.packageId ?? null,
      instructorUserId: input.instructorUserId ?? null,
      lessonsCompleted: input.lessonsCompleted ?? 0,
      lessonsTotal: input.lessonsTotal ?? pkg?.lessons ?? 0,
      theoryLessonsCompleted: input.theoryLessonsCompleted ?? 0,
      theoryLessonsTotal: theoryTotal,
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
      inviteToSystem: boolean;
      phone: string | null;
      branchId: number;
      packageId: number | null;
      instructorUserId: number | null;
      lessonsCompleted: number;
      lessonsTotal: number;
      theoryLessonsCompleted: number;
      theoryLessonsTotal: number;
      enrollmentStatus: string;
      skillRating: number;
      licenseAchieved: boolean;
      joinedIso: string;
    }>,
  ): Promise<AdminStudentRow | null> {
    const user = await User.findByPk(userId);
    const profile = await StudentProfile.findOne({ where: { userId } });
    if (!user || !profile) return null;
    let nextEmail: string | undefined;
    if (patch.email !== undefined || patch.inviteToSystem !== undefined) {
      const inviteToSystem = patch.inviteToSystem ?? !isInternalNoLoginEmail(user.email);
      const candidate = (patch.email ?? user.email ?? '').trim().toLowerCase();
      if (inviteToSystem && (!candidate || isInternalNoLoginEmail(candidate))) {
        throw new InputValidationError('Email is required when inviteToSystem is true', HttpStatusCodesUtil.BAD_REQUEST);
      }
      nextEmail = !inviteToSystem && !candidate ? generateInternalNoLoginEmail(userId) : candidate;
      const other = await User.findOne({ where: { email: nextEmail, id: { [Op.ne]: userId } } });
      if (other) {
        throw new ConflictError('Email already in use', HttpStatusCodesUtil.CONFLICT);
      }
    }
    if (patch.name !== undefined || patch.email !== undefined || patch.phone !== undefined || nextEmail !== undefined) {
      await user.update({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(nextEmail !== undefined ? { email: nextEmail } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      });
    }
    let nextPackageId: number | null | undefined;
    let packageForTheory: Package | null = null;
    if (patch.packageId !== undefined) {
      if (patch.packageId === null) {
        nextPackageId = null;
      } else {
        const pkg = await Package.findByPk(patch.packageId);
        if (!pkg) return null;
        nextPackageId = patch.packageId;
        packageForTheory = pkg;
      }
    }
    const packageChangingToNew =
      patch.packageId !== undefined &&
      patch.packageId !== null &&
      profile.packageId !== patch.packageId;
    const syncTheoryFromPackage =
      packageChangingToNew &&
      packageForTheory != null &&
      patch.theoryLessonsTotal === undefined &&
      patch.theoryLessonsCompleted === undefined;
    await profile.update({
      ...(patch.branchId !== undefined ? { branchId: patch.branchId } : {}),
      ...(nextPackageId !== undefined ? { packageId: nextPackageId } : {}),
      ...(nextPackageId === null ? { theoryLessonsTotal: 0, theoryLessonsCompleted: 0 } : {}),
      ...(syncTheoryFromPackage
        ? {
            theoryLessonsTotal: Number(packageForTheory!.theoryLessons ?? 0),
            theoryLessonsCompleted: 0,
          }
        : {}),
      ...(patch.instructorUserId !== undefined ? { instructorUserId: patch.instructorUserId } : {}),
      ...(patch.lessonsCompleted !== undefined ? { lessonsCompleted: patch.lessonsCompleted } : {}),
      ...(patch.lessonsTotal !== undefined ? { lessonsTotal: patch.lessonsTotal } : {}),
      ...(patch.theoryLessonsCompleted !== undefined ? { theoryLessonsCompleted: patch.theoryLessonsCompleted } : {}),
      ...(patch.theoryLessonsTotal !== undefined ? { theoryLessonsTotal: patch.theoryLessonsTotal } : {}),
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
