import type { Transaction } from 'sequelize';
import { Op } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { Branch, Package, PackageLessonBalance, PackageOrder, StudentExtraPractical, StudentProfile, User } from '../models';
import FinanceService from './finance.service';
import NotificationService from './notification.service';
import { parseAmdFromPriceDisplay } from '../utils/price-display.util';
import { assertDirectPaymentAllowed } from '../utils/vpos.util';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { InputValidationError } = ErrorsUtil;

/** Fallback when legacy rows have `theory_lessons_total` = 0 but package defines theory. */
function legacyTheorySessionsFromPackageName(pkg: Package): number {
  const name = pkg.name.toLowerCase();
  if (name.includes('premium')) return 16;
  if (name.includes('standard')) return 12;
  if (name.includes('basic') || name.includes('refresher')) return 8;
  return 10;
}

function effectiveTheoryTotal(pkg: Package | null, profile: StudentProfile): number {
  const fromProfile = Number(profile.theoryLessonsTotal ?? 0);
  if (fromProfile > 0) return fromProfile;
  const fromPkg = pkg ? Number(pkg.theoryLessons ?? 0) : 0;
  if (fromPkg > 0) return fromPkg;
  if (pkg) return legacyTheorySessionsFromPackageName(pkg);
  return 0;
}

export type PackageTierId = 'basic' | 'standard' | 'premium';

function tierFromPackage(pkg: Package): PackageTierId {
  const n = pkg.name.toLowerCase();
  if (n.includes('premium')) return 'premium';
  if (n.includes('standard')) return 'standard';
  return 'basic';
}

export type StudentEntitlementsDto = {
  packages: Array<{
    purchaseId: number;
    packageId: number;
    packageName: string;
    tier: PackageTierId;
    purchasedAt: string;
    status: string;
    practicalTotal: number;
    practicalUsed: number;
    theoryTotal: number;
    theoryUsed: number;
    personalTheoryTotal: number;
    personalTheoryUsed: number;
  }>;
  extras: Array<{
    id: number;
    purchasedAt: string;
    practicalTotal: number;
    practicalUsed: number;
    priceDisplay: string;
  }>;
};

export default class StudentEntitlementsService {
  static async get(userId: number): Promise<StudentEntitlementsDto | null> {
    const user = await User.findByPk(userId);

    if (!user || user.accountType !== 'student') return null;

    const orders = await PackageOrder.findAll({
      where: { studentUserId: userId },
      include: [{ model: Package, as: 'package', required: true }],
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
    });

    if (orders.length > 0) {
      const balances = await PackageLessonBalance.findAll({
        where: { packageOrderId: orders.map((o) => o.id) },
      });

      const byOrder = new Map<number, PackageLessonBalance[]>();

      for (const b of balances) {
        const list = byOrder.get(b.packageOrderId) ?? [];
        list.push(b);
        byOrder.set(b.packageOrderId, list);
      }

      return {
        packages: orders.map((o) => {
          const pkg = (o as PackageOrder & { package: Package }).package;
          const rows = byOrder.get(o.id) ?? [];
          const byType = new Map(rows.map((r) => [r.lessonType, r] as const));
          const practical = byType.get('practical');
          const theory = byType.get('theory');
          const personalTheory = byType.get('theory_personal');
          const theoryTotal = Number(personalTheory?.totalIncluded ?? theory?.totalIncluded ?? 0);
          const theoryUsed = Number(personalTheory?.bookedCount ?? theory?.bookedCount ?? 0);
          return {
            purchaseId: o.id,
            packageId: pkg.id,
            packageName: pkg.name,
            tier: tierFromPackage(pkg),
            purchasedAt: dateIso(o.paidAt ?? (o as PackageOrder & { createdAt?: Date | null }).createdAt),
            status: String(o.status ?? 'active'),
            practicalTotal: Number(practical?.totalIncluded ?? 0),
            practicalUsed: Number(practical?.bookedCount ?? 0),
            theoryTotal,
            theoryUsed,
            personalTheoryTotal: theoryTotal,
            personalTheoryUsed: theoryUsed,
          };
        }),
        extras: await this.listExtras(userId),
      };
    }
    const profile = await StudentProfile.findOne({ where: { userId } });

    if (!profile) {
      return { packages: [], extras: await this.listExtras(userId) };
    }

    if (profile.packageId == null) {
      return { packages: [], extras: await this.listExtras(userId) };
    }

    const pkg = await Package.findByPk(profile.packageId);
    if (!pkg) {
      return { packages: [], extras: await this.listExtras(userId) };
    }

    const joined = typeof profile.joinedAt === 'string' ? profile.joinedAt.slice(0, 10) : String(profile.joinedAt).slice(0, 10);
    const theoryTotal = effectiveTheoryTotal(pkg, profile);
    const theoryUsed = Math.min(theoryTotal, Number(profile.theoryLessonsCompleted ?? 0));

    return {
      packages: [
        {
          purchaseId: profile.packageId,
          packageId: profile.packageId,
          packageName: pkg.name,
          tier: tierFromPackage(pkg),
          purchasedAt: joined,
          status: 'active',
          practicalTotal: profile.lessonsTotal,
          practicalUsed: profile.lessonsCompleted,
          theoryTotal,
          theoryUsed,
          personalTheoryTotal: 0,
          personalTheoryUsed: 0,
        },
      ],
      extras: await this.listExtras(userId),
    };
  }

  private static async listExtras(userId: number): Promise<StudentEntitlementsDto['extras']> {
    const rows = await StudentExtraPractical.findAll({ where: { userId }, order: [['purchasedAt', 'DESC']] });
    return rows.map((r) => ({
      id: r.id,
      purchasedAt: dateIso(r.purchasedAt),
      practicalTotal: r.practicalTotal,
      practicalUsed: r.practicalUsed,
      priceDisplay: '12,000 ֏',
    }));
  }

  /**
   * Applies package enrollment (profile rows). Used both for admin-style assigns and paid checkout.
   */
  private static async applyPackageAssignment(
    userId: number,
    packageId: number,
    orderStatus: 'active' | 'paid' = 'active',
    transaction?: Transaction,
  ): Promise<{ branchId: number } | null> {
    const user = await User.findByPk(userId, { transaction });
    if (!user || user.accountType !== 'student') return null;
    const pkg = await Package.findByPk(packageId, { transaction });
    if (!pkg) return null;
    const theoryTotal =
      Number(pkg.theoryLessons ?? 0) > 0 ? Number(pkg.theoryLessons) : legacyTheorySessionsFromPackageName(pkg);
    const order = await PackageOrder.create(
      {
        studentUserId: userId,
        packageId: pkg.id,
        status: orderStatus,
        paidAt: orderStatus === 'paid' ? new Date() : null,
        source: orderStatus === 'paid' ? 'student_checkout' : 'admin_assign',
      },
      { transaction },
    );
    await PackageLessonBalance.bulkCreate(
      [
        {
          packageOrderId: order.id,
          studentUserId: userId,
          packageId: pkg.id,
          lessonType: 'practical',
          totalIncluded: Number(pkg.lessons ?? 0),
          bookedCount: 0,
        },
        {
          packageOrderId: order.id,
          studentUserId: userId,
          packageId: pkg.id,
          lessonType: 'theory_personal',
          totalIncluded: theoryTotal,
          bookedCount: 0,
        },
      ],
      { transaction },
    );
    let profile = await StudentProfile.findOne({ where: { userId }, transaction });
    if (!profile) {
      const branch = await Branch.findOne({ order: [['id', 'ASC']], transaction });
      if (!branch) return null;
      await StudentProfile.create(
        {
          userId,
          branchId: branch.id,
          packageId: pkg.id,
          instructorUserId: null,
          lessonsCompleted: 0,
          lessonsTotal: pkg.lessons,
          theoryLessonsCompleted: 0,
          theoryLessonsTotal: theoryTotal,
          enrollmentStatus: 'active',
          skillRating: 0,
          licenseAchieved: false,
          joinedAt: new Date().toISOString().slice(0, 10),
        },
        { transaction },
      );
      return { branchId: branch.id };
    }
    await profile.update(
      {
        packageId: pkg.id,
        lessonsTotal: pkg.lessons,
        lessonsCompleted: 0,
        theoryLessonsTotal: theoryTotal,
        theoryLessonsCompleted: 0,
        enrollmentStatus: 'active',
      },
      { transaction },
    );
    return { branchId: profile.branchId };
  }

  /** vPOS checkout: records package payment then enrolls the student in the package. */
  static async purchasePackageAfterOnlinePayment(
    userId: number,
    packageId: number,
    options?: { providerRef?: string; transaction?: Transaction },
  ): Promise<StudentEntitlementsDto | null> {
    const user = await User.findByPk(userId, options?.transaction ? { transaction: options.transaction } : undefined);
    if (!user || user.accountType !== 'student') return null;
    const pkg = await Package.findByPk(packageId, options?.transaction ? { transaction: options.transaction } : undefined);
    if (!pkg) return null;
    const gross = parseAmdFromPriceDisplay(pkg.priceDisplay);
    if (gross <= 0) {
      throw new InputValidationError(
        'This package does not have a valid price for online payment.',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }

    const run = async (transaction: Transaction) => {
      const applied = await this.applyPackageAssignment(userId, packageId, 'paid', transaction);
      if (!applied) {
        throw new InputValidationError('Could not enroll in package.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      const providerRef =
        options?.providerRef?.trim() || `package-vpos:${userId}:${packageId}:${Date.now()}`;
      await FinanceService.create({
        customer: user.name.trim() || 'Student',
        email: user.email ?? '',
        description: `Driving package: ${pkg.name} — vPOS`,
        branchId: applied.branchId,
        channel: 'pos',
        method: 'card',
        grossAmd: gross,
        feeAmd: 0,
        status: 'completed',
        providerRef,
        source: 'system',
        bookingId: null,
        transaction,
      });
    };

    if (options?.transaction) {
      await run(options.transaction);
    } else {
      await sequelize.transaction(run);
    }
    await this.notifyPackagePurchase(user, pkg).catch(() => {});

    return this.get(userId);
  }

  static async assignPackage(userId: number, packageId: number): Promise<StudentEntitlementsDto | null> {
    const applied = await sequelize.transaction(async (transaction) =>
      this.applyPackageAssignment(userId, packageId, 'active', transaction),
    );
    if (!applied) return null;
    return this.get(userId);
  }

  /**
   * Ensures the student has an active package order + lesson balances for `packageId`.
   * Used when admin assigns a package on profile without booking slots yet (legacy profile rows included).
   */
  static async ensureActivePackageOrder(
    userId: number,
    packageId: number,
    transaction?: Transaction,
  ): Promise<number | null> {
    const run = async (tx: Transaction) => {
      const existing = await PackageOrder.findOne({
        where: {
          studentUserId: userId,
          packageId,
          status: { [Op.in]: ['active', 'paid', 'confirmed'] },
        },
        order: [
          ['createdAt', 'DESC'],
          ['id', 'DESC'],
        ],
        transaction: tx,
      });
      if (existing) return existing.id;

      const pkg = await Package.findByPk(packageId, { transaction: tx });
      if (!pkg) return null;

      const profile = await StudentProfile.findOne({ where: { userId }, transaction: tx });
      const theoryTotal =
        profile && Number(profile.theoryLessonsTotal ?? 0) > 0
          ? Number(profile.theoryLessonsTotal)
          : Number(pkg.theoryLessons ?? 0) > 0
            ? Number(pkg.theoryLessons)
            : legacyTheorySessionsFromPackageName(pkg);
      const practicalTotal =
        profile && Number(profile.lessonsTotal ?? 0) > 0 ? Number(profile.lessonsTotal) : Number(pkg.lessons ?? 0);
      const practicalBooked = profile ? Math.max(0, Number(profile.lessonsCompleted ?? 0)) : 0;
      const theoryBooked = profile ? Math.max(0, Number(profile.theoryLessonsCompleted ?? 0)) : 0;

      const order = await PackageOrder.create(
        {
          studentUserId: userId,
          packageId: pkg.id,
          status: 'active',
          paidAt: null,
          source: 'admin_assign',
          note: 'Auto-created when admin assigned package without immediate slot booking.',
        },
        { transaction: tx },
      );
      await PackageLessonBalance.bulkCreate(
        [
          {
            packageOrderId: order.id,
            studentUserId: userId,
            packageId: pkg.id,
            lessonType: 'practical',
            totalIncluded: Math.max(0, practicalTotal),
            bookedCount: practicalBooked,
          },
          {
            packageOrderId: order.id,
            studentUserId: userId,
            packageId: pkg.id,
            lessonType: 'theory_personal',
            totalIncluded: Math.max(0, theoryTotal),
            bookedCount: theoryBooked,
          },
        ],
        { transaction: tx },
      );
      return order.id;
    };

    if (transaction) return run(transaction);
    return sequelize.transaction(run);
  }

  static async addExtraPractical(userId: number, practicalTotal = 3): Promise<StudentEntitlementsDto | null> {
    assertDirectPaymentAllowed();
    return this.purchaseExtraPracticalAfterOnlinePayment(userId, practicalTotal);
  }

  /** vPOS checkout: records payment then creates the extra practical block. */
  static async purchaseExtraPracticalAfterOnlinePayment(
    userId: number,
    practicalTotal = 3,
    options?: { providerRef?: string; transaction?: Transaction },
  ): Promise<StudentEntitlementsDto | null> {
    const user = await User.findByPk(userId, options?.transaction ? { transaction: options.transaction } : undefined);

    if (!user || user.accountType !== 'student') return null;

    const profile = await StudentProfile.findOne({
      where: { userId },
      ...(options?.transaction ? { transaction: options.transaction } : {}),
    });
    if (!profile) return null;

    const run = async (transaction: Transaction) => {
      const purchasedAt = new Date().toISOString().slice(0, 10);
      const extra = await StudentExtraPractical.create(
        {
          userId,
          practicalTotal,
          practicalUsed: 0,
          purchasedAt,
        },
        { transaction },
      );

      const gross = parseAmdFromPriceDisplay('12,000 ֏');
      const providerRef =
        options?.providerRef?.trim() || `extra-vpos:${userId}:${extra.id}:${Date.now()}`;
      await FinanceService.create({
        customer: user.name.trim() || 'Student',
        email: user.email ?? '',
        description: `Extra practical lessons (${practicalTotal}) — vPOS`,
        branchId: profile.branchId,
        channel: 'pos',
        method: 'card',
        grossAmd: gross,
        feeAmd: 0,
        status: 'completed',
        providerRef,
        source: 'system',
        bookingId: null,
        transaction,
      });
    };

    if (options?.transaction) {
      await run(options.transaction);
    } else {
      await sequelize.transaction(run);
    }
    return this.get(userId);
  }

  private static async notifyPackagePurchase(user: User, pkg: Package): Promise<void> {
    const studentName = user.name?.trim() || 'Student';
    const packageLabel = pkg.name.trim() || 'Package';
    await NotificationService.createOne({
      recipientUserId: user.id,
      recipientRole: 'student',
      type: 'PAYMENT_RECEIVED',
      title: 'Package activated',
      message: `Your package purchase is confirmed (${packageLabel}). You can now pick your lesson slots.`,
      entityType: 'system',
      entityId: String(pkg.id),
      dedupeKey: `package-purchase:student:${user.id}:package:${pkg.id}`,
      metadata: { packageId: pkg.id, packageName: packageLabel },
    });
    await NotificationService.createForRoles(['admin', 'super_admin'], {
      type: 'PAYMENT_RECEIVED',
      title: 'Package purchased',
      message: `${studentName} purchased ${packageLabel}.`,
      entityType: 'system',
      entityId: String(pkg.id),
      dedupeKey: `package-purchase:staff:student:${user.id}:package:${pkg.id}`,
      metadata: { studentUserId: user.id, packageId: pkg.id, packageName: packageLabel },
    });
  }
}

function dateIso(v: unknown): string {
  if (typeof v === 'string') return v.slice(0, 10);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}
