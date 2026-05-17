import { Op } from 'sequelize';
import { sequelize } from '../database/sequelize';
import {
  AdminMfaChallenge,
  Booking,
  BookingSlot,
  Branch,
  ExamQuestionBookmark,
  ExamQuestionComment,
  Notification,
  OAuthAccount,
  Package,
  PackageLessonBalance,
  PackageOrder,
  RefreshToken,
  StudentExamStats,
  StudentExtraPractical,
  StudentInvitation,
  StudentProfile,
  TheoryCohortEnrollment,
  User,
} from '../models';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';
import FinanceService from './finance.service';
import InstructorStudentRatingService from './instructor-student-rating.service';
import StudentEntitlementsService from './student-entitlements.service';

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
  /**
   * True when `/admin/invite-student` can succeed: no password yet, no OAuth-only sign-in,
   * and a real (non internal placeholder) email is on file.
   */
  inviteEligible: boolean;
};

function studentInviteEligible(stu: User, oauthUserIds: Set<number>): boolean {
  if (stu.passwordHash) return false;
  if (oauthUserIds.has(stu.id)) return false;
  const email = typeof stu.email === 'string' ? stu.email.trim() : '';
  if (!email || isInternalNoLoginEmail(email)) return false;
  return true;
}

export default class StudentAdminService {
  private static async ensureProfilesForStudents(userIds?: number[]): Promise<void> {
    const branch = await Branch.findOne({ order: [['id', 'ASC']] });
    if (!branch) return;

    const where = userIds?.length
      ? { id: { [Op.in]: userIds }, accountType: 'student' as const }
      : { accountType: 'student' as const };
    const students = await User.findAll({ where, attributes: ['id'] });
    if (students.length === 0) return;

    const existingProfiles = await StudentProfile.findAll({
      where: { userId: { [Op.in]: students.map((s) => s.id) } },
      attributes: ['userId'],
    });
    const existingUserIds = new Set(existingProfiles.map((p) => p.userId));

    for (const student of students) {
      if (existingUserIds.has(student.id)) continue;
      await StudentProfile.create({
        userId: student.id,
        branchId: branch.id,
        packageId: null,
        instructorUserId: null,
        lessonsCompleted: 0,
        lessonsTotal: 0,
        theoryLessonsCompleted: 0,
        theoryLessonsTotal: 0,
        enrollmentStatus: 'active',
        skillRating: 0,
        licenseAchieved: false,
        joinedAt: new Date().toISOString().slice(0, 10),
      });
    }
  }

  private static async oauthUserIdSetFor(userIds: number[]): Promise<Set<number>> {
    if (userIds.length === 0) return new Set();
    const oauthRows = await OAuthAccount.findAll({
      where: { userId: { [Op.in]: userIds } },
      attributes: ['userId'],
    });
    return new Set(oauthRows.map((r) => r.userId));
  }

  private static mapProfileRows(rows: StudentProfile[], oauthUserIds: Set<number>): AdminStudentRow[] {
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
          inviteEligible: studentInviteEligible(stu, oauthUserIds),
        };
      })
      .filter((row): row is AdminStudentRow => row != null);
  }

  static async list(branchId?: number): Promise<AdminStudentRow[]> {
    await this.ensureProfilesForStudents();
    const rows = await StudentProfile.findAll({
      ...(branchId !== undefined ? { where: { branchId } } : {}),
      include: [
        { model: User, as: 'studentAccount', required: true },
        { model: Package, as: 'package', required: false },
        { model: User, as: 'assignedInstructor', required: false },
      ],
      order: [['joinedAt', 'DESC']],
    });
    const userIds = rows
      .map((sp) => (sp as ProfileJoined).studentAccount?.id)
      .filter((id): id is number => typeof id === 'number');
    const oauthUserIds = await this.oauthUserIdSetFor(userIds);
    return this.mapProfileRows(rows, oauthUserIds);
  }

  /** Students assigned to this instructor (`student_profiles.instructor_user_id`). */
  static async listForInstructor(instructorUserId: number): Promise<AdminStudentRow[]> {
    const assignedStudentProfiles = await StudentProfile.findAll({
      where: { instructorUserId },
      attributes: ['userId'],
    });
    await this.ensureProfilesForStudents(assignedStudentProfiles.map((p) => p.userId));
    const rows = await StudentProfile.findAll({
      where: { instructorUserId },
      include: [
        { model: User, as: 'studentAccount', required: true },
        { model: Package, as: 'package', required: false },
        { model: User, as: 'assignedInstructor', required: false },
      ],
      order: [['joinedAt', 'DESC']],
    });
    const userIds = rows
      .map((sp) => (sp as ProfileJoined).studentAccount?.id)
      .filter((id): id is number => typeof id === 'number');
    const oauthUserIds = await this.oauthUserIdSetFor(userIds);
    return this.mapProfileRows(rows, oauthUserIds);
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
    if (packageChangingToNew && patch.packageId != null) {
      await StudentEntitlementsService.assignPackage(userId, patch.packageId);
    }
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
    if (patch.packageId != null && patch.packageId > 0) {
      await StudentEntitlementsService.ensureActivePackageOrder(userId, patch.packageId);
    }
    const list = await this.list();
    return list.find((r) => r.id === userId) ?? null;
  }

  static async remove(userId: number): Promise<boolean> {
    const user = await User.findByPk(userId, { attributes: ['id', 'accountType'] });
    if (!user || user.accountType !== 'student') {
      return false;
    }

    await sequelize.transaction(async (transaction) => {
      const bookings = await Booking.findAll({
        where: { studentUserId: userId },
        attributes: ['id'],
        transaction,
      });
      const bookingIds = bookings.map((b) => b.id).filter((id): id is number => typeof id === 'number');
      await FinanceService.deleteAllForStudentUser(userId, transaction);
      if (bookingIds.length > 0) {
        await BookingSlot.destroy({ where: { bookingId: { [Op.in]: bookingIds } }, transaction });
      }
      await Booking.destroy({ where: { studentUserId: userId }, transaction });
      await TheoryCohortEnrollment.destroy({ where: { studentUserId: userId }, transaction });
      await PackageLessonBalance.destroy({ where: { studentUserId: userId }, transaction });
      await PackageOrder.destroy({ where: { studentUserId: userId }, transaction });
      await InstructorStudentRatingService.removeAllForStudent(userId, transaction);
      await StudentProfile.destroy({ where: { userId }, transaction });
      await OAuthAccount.destroy({ where: { userId }, transaction });
      await RefreshToken.destroy({ where: { userId }, transaction });
      await StudentInvitation.destroy({ where: { userId }, transaction });
      await StudentExamStats.destroy({ where: { userId }, transaction });
      await StudentExtraPractical.destroy({ where: { userId }, transaction });
      await ExamQuestionBookmark.destroy({ where: { userId }, transaction });
      await ExamQuestionComment.destroy({ where: { userId }, transaction });
      await Notification.destroy({ where: { recipientUserId: userId }, transaction });
      await AdminMfaChallenge.destroy({ where: { userId }, transaction });
      const deletedUsers = await User.destroy({ where: { id: userId, accountType: 'student' }, transaction });
      if (deletedUsers === 0) {
        throw new Error('Student user was not deleted');
      }
    });

    return true;
  }
}
