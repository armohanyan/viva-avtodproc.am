import { Op, QueryTypes, type Includeable, type WhereOptions } from 'sequelize';
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
import { normalizeOptionalPhone } from '../utils/student-phones.util';

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
  /** Optional secondary phone; empty string when unset. */
  phone2: string;
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

export type AdminStudentListQuery = {
  page: number;
  pageSize: number;
  branchId?: number;
  search?: string;
  /** Exact instructor display name from the students table filter. */
  instructor?: string;
};

export type AdminStudentListResult = {
  items: AdminStudentRow[];
  page: number;
  pageSize: number;
  total: number;
};

const STUDENT_ACCOUNT_LIST_ATTRIBUTES = ['id', 'name', 'email', 'phone', 'phone2', 'passwordHash'] as const;

export default class StudentAdminService {
  /** Skip repeat full-table backfills while an admin pages through the list. */
  private static profilesEnsuredAt = 0;
  private static readonly PROFILES_ENSURE_TTL_MS = 20_000;

  /**
   * Create missing student profiles in one query + one insert.
   * Previously this loaded every student and inserted one row at a time on each list request.
   */
  private static async ensureProfilesForStudents(userIds?: number[]): Promise<void> {
    const scoped = userIds != null;
    const scopedIds = scoped ? userIds.filter((id) => Number.isFinite(id) && id > 0) : [];
    if (scoped && scopedIds.length === 0) return;
    if (!scoped && Date.now() - this.profilesEnsuredAt < this.PROFILES_ENSURE_TTL_MS) return;

    const branch = await Branch.findOne({ order: [['id', 'ASC']], attributes: ['id'] });
    if (!branch) return;

    const missing = await sequelize.query<{ id: number }>(
      `SELECT u.id AS id
       FROM users u
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       WHERE u.account_type = 'student'
         AND sp.user_id IS NULL
         ${scoped ? 'AND u.id IN (:userIds)' : ''}`,
      {
        type: QueryTypes.SELECT,
        ...(scoped ? { replacements: { userIds: scopedIds } } : {}),
      },
    );

    if (missing.length > 0) {
      const joinedAt = new Date().toISOString().slice(0, 10);
      await StudentProfile.bulkCreate(
        missing.map((student) => ({
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
          joinedAt,
        })),
        { ignoreDuplicates: true },
      );
    }

    if (!scoped) this.profilesEnsuredAt = Date.now();
  }

  private static profileListInclude(opts?: { instructorName?: string; includeBranch?: boolean }): Includeable[] {
    const instructor = opts?.instructorName?.trim();
    const include: Includeable[] = [
      {
        model: User,
        as: 'studentAccount' as const,
        required: true,
        attributes: [...STUDENT_ACCOUNT_LIST_ATTRIBUTES],
      },
      {
        model: Package,
        as: 'package' as const,
        required: false,
        attributes: ['id', 'name'],
      },
      {
        model: User,
        as: 'assignedInstructor' as const,
        required: Boolean(instructor),
        attributes: ['id', 'name'],
        ...(instructor ? { where: { name: instructor } } : {}),
      },
    ];
    if (opts?.includeBranch) {
      include.push({
        model: Branch,
        required: false,
        attributes: ['id', 'name'],
      });
    }
    return include;
  }

  private static escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  }

  private static buildListWhere(query: { branchId?: number; search?: string }): WhereOptions {
    const andParts: WhereOptions[] = [];
    if (query.branchId !== undefined) {
      andParts.push({ branchId: query.branchId });
    }
    const search = query.search?.trim().slice(0, 100) ?? '';
    if (search) {
      const like = { [Op.like]: `%${this.escapeLike(search)}%` };
      const orParts: WhereOptions[] = [
        { '$studentAccount.name$': like },
        { '$studentAccount.email$': like },
        { '$studentAccount.phone$': like },
        { '$studentAccount.phone2$': like },
        { '$package.name$': like },
        { '$assignedInstructor.name$': like },
        { '$Branch.name$': like },
        { enrollmentStatus: like },
        sequelize.where(sequelize.cast(sequelize.col('StudentProfile.joined_at'), 'CHAR'), like),
        sequelize.where(
          sequelize.fn(
            'CONCAT',
            sequelize.col('StudentProfile.lessons_completed'),
            '/',
            sequelize.col('StudentProfile.lessons_total'),
          ),
          like,
        ),
      ];
      if (/^\d+$/.test(search)) {
        const n = Number(search);
        if (Number.isFinite(n) && n > 0) orParts.push({ userId: n });
        if (Number.isFinite(n) && n >= 0 && n <= 10) orParts.push({ skillRating: n });
      }
      andParts.push({ [Op.or]: orParts });
    }
    if (andParts.length === 0) return {};
    if (andParts.length === 1) return andParts[0]!;
    return { [Op.and]: andParts };
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
          phone2: stu.phone2 ?? '',
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
      include: this.profileListInclude(),
      order: [['joinedAt', 'DESC']],
    });
    const userIds = rows
      .map((sp) => (sp as ProfileJoined).studentAccount?.id)
      .filter((id): id is number => typeof id === 'number');
    const oauthUserIds = await this.oauthUserIdSetFor(userIds);
    return this.mapProfileRows(rows, oauthUserIds);
  }

  static async listPaginated(query: AdminStudentListQuery): Promise<AdminStudentListResult> {
    const page = Math.max(1, Math.floor(query.page));
    const pageSize = Math.min(100, Math.max(1, Math.floor(query.pageSize)));
    const search = query.search?.trim() ?? '';
    const instructor = query.instructor?.trim() ?? '';
    await this.ensureProfilesForStudents();
    const result = await StudentProfile.findAndCountAll({
      where: this.buildListWhere({ branchId: query.branchId, search }),
      include: this.profileListInclude({
        ...(instructor ? { instructorName: instructor } : {}),
        includeBranch: search.length > 0,
      }),
      order: [
        ['joinedAt', 'DESC'],
        ['userId', 'DESC'],
      ],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      distinct: true,
      subQuery: false,
    });
    const rows = result.rows;
    const userIds = rows
      .map((sp) => (sp as ProfileJoined).studentAccount?.id)
      .filter((id): id is number => typeof id === 'number');
    const oauthUserIds = await this.oauthUserIdSetFor(userIds);
    const total = typeof result.count === 'number' ? result.count : rows.length;
    return {
      items: this.mapProfileRows(rows, oauthUserIds),
      page,
      pageSize,
      total,
    };
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
      include: this.profileListInclude(),
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
    phone2?: string | null;
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
      phone: normalizeOptionalPhone(input.phone),
      phone2: normalizeOptionalPhone(input.phone2),
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
      phone2: string | null;
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
      const currentIsInternal = isInternalNoLoginEmail(user.email);
      let candidate: string;
      if (patch.email !== undefined) {
        const trimmed = patch.email.trim().toLowerCase();
        // Empty email is optional: keep existing no-login address, or clear a real email to no-login.
        candidate = !trimmed ? (currentIsInternal ? user.email : '') : trimmed;
      } else {
        candidate = (user.email ?? '').trim().toLowerCase();
      }
      const hasRealEmail = Boolean(candidate) && !isInternalNoLoginEmail(candidate);
      const inviteToSystem = patch.inviteToSystem ?? hasRealEmail;
      if (inviteToSystem && !hasRealEmail) {
        throw new InputValidationError('Email is required when inviteToSystem is true', HttpStatusCodesUtil.BAD_REQUEST);
      }
      nextEmail = hasRealEmail
        ? candidate
        : currentIsInternal
          ? user.email
          : generateInternalNoLoginEmail(userId);
      const other = await User.findOne({ where: { email: nextEmail, id: { [Op.ne]: userId } } });
      if (other) {
        throw new ConflictError('Email already in use', HttpStatusCodesUtil.CONFLICT);
      }
    }
    if (
      patch.name !== undefined ||
      patch.email !== undefined ||
      patch.phone !== undefined ||
      patch.phone2 !== undefined ||
      nextEmail !== undefined
    ) {
      await user.update({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(nextEmail !== undefined ? { email: nextEmail } : {}),
        ...(patch.phone !== undefined ? { phone: normalizeOptionalPhone(patch.phone) } : {}),
        ...(patch.phone2 !== undefined ? { phone2: normalizeOptionalPhone(patch.phone2) } : {}),
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
