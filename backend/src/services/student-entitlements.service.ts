import type { Transaction } from 'sequelize';
import { Op } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { Branch, FinanceTransaction, Package, PackageLessonBalance, PackageOrder, StudentExtraPractical, StudentProfile, User } from '../models';
import FinanceService from './finance.service';
import NotificationService from './notification.service';
import { parseAmdFromPriceDisplay } from '../utils/price-display.util';
import { assertDirectPaymentAllowed } from '../utils/vpos.util';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { InputValidationError } = ErrorsUtil;

/** Theory sessions included in a package catalog row (0 when practical-only). */
function theoryTotalFromPackage(pkg: Package | null | undefined): number {
  return Math.max(0, Number(pkg?.theoryLessons ?? 0));
}

function effectiveTheoryTotal(pkg: Package | null, profile: StudentProfile): number {
  const fromProfile = Number(profile.theoryLessonsTotal ?? 0);
  if (fromProfile > 0) return fromProfile;
  return theoryTotalFromPackage(pkg);
}

/** Prefer group `theory` balance; fall back to legacy `theory_personal` rows. */
function theoryBalanceFromRows(rows: PackageLessonBalance[]): {
  total: number;
  used: number;
} {
  const byType = new Map(rows.map((r) => [r.lessonType, r] as const));
  const theory = byType.get('theory');
  const personal = byType.get('theory_personal');
  const row = theory ?? personal;
  return {
    total: Number(row?.totalIncluded ?? 0),
    used: Number(row?.bookedCount ?? 0),
  };
}

function packageDtoFromBalances(
  o: PackageOrder,
  pkg: Package,
  rows: PackageLessonBalance[],
): StudentEntitlementsDto['packages'][number] {
  const byType = new Map(rows.map((r) => [r.lessonType, r] as const));
  const practical = byType.get('practical');
  const practicalTotal = Number(practical?.totalIncluded ?? 0);
  const practicalUsed = Number(practical?.bookedCount ?? 0);
  const theory = theoryBalanceFromRows(rows);
  return {
    purchaseId: o.id,
    packageId: pkg.id,
    packageName: pkg.name,
    tier: tierFromPackage(pkg),
    purchasedAt: dateIso(o.paidAt ?? (o as PackageOrder & { createdAt?: Date | null }).createdAt),
    status: String(o.status ?? 'active'),
    practicalTotal,
    practicalUsed,
    practicalRemaining: Math.max(0, practicalTotal - practicalUsed),
    theoryTotal: theory.total,
    theoryUsed: theory.used,
    theoryRemaining: Math.max(0, theory.total - theory.used),
    theoryIncluded: theory.total > 0,
    theoryConsumed: theory.total > 0 && theory.used >= theory.total,
    // Legacy aliases: package theory is group theory, not 1:1.
    personalTheoryTotal: 0,
    personalTheoryUsed: 0,
  };
}

export type PackageTierId = 'basic' | 'standard' | 'premium';

function tierFromPackage(pkg: Package): PackageTierId {
  const n = pkg.name.toLowerCase();
  if (n.includes('premium')) return 'premium';
  if (n.includes('standard')) return 'standard';
  return 'basic';
}

export type StudentEntitlementsDto = {
  hasActivePackage: boolean;
  packages: Array<{
    purchaseId: number;
    packageId: number;
    packageName: string;
    tier: PackageTierId;
    purchasedAt: string;
    status: string;
    practicalTotal: number;
    practicalUsed: number;
    practicalRemaining: number;
    theoryTotal: number;
    theoryUsed: number;
    theoryRemaining: number;
    theoryIncluded: boolean;
    theoryConsumed: boolean;
    /** @deprecated Package theory is group theory; kept for older clients (always 0 for new rows). */
    personalTheoryTotal: number;
    /** @deprecated */
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

      const packages = orders.map((o) => {
        const pkg = (o as PackageOrder & { package: Package }).package;
        return packageDtoFromBalances(o, pkg, byOrder.get(o.id) ?? []);
      });
      const hasActivePackage = packages.some((p) =>
        ['active', 'paid', 'confirmed'].includes(String(p.status ?? '').toLowerCase()),
      );

      return {
        hasActivePackage,
        packages,
        extras: await this.listExtras(userId),
      };
    }
    const profile = await StudentProfile.findOne({ where: { userId } });

    if (!profile) {
      return { hasActivePackage: false, packages: [], extras: await this.listExtras(userId) };
    }

    if (profile.packageId == null) {
      return { hasActivePackage: false, packages: [], extras: await this.listExtras(userId) };
    }

    const pkg = await Package.findByPk(profile.packageId);
    if (!pkg) {
      return { hasActivePackage: false, packages: [], extras: await this.listExtras(userId) };
    }

    const joined = typeof profile.joinedAt === 'string' ? profile.joinedAt.slice(0, 10) : String(profile.joinedAt).slice(0, 10);
    const theoryTotal = effectiveTheoryTotal(pkg, profile);
    const theoryUsed = Math.min(theoryTotal, Number(profile.theoryLessonsCompleted ?? 0));
    const practicalTotal = Number(profile.lessonsTotal ?? 0);
    const practicalUsed = Number(profile.lessonsCompleted ?? 0);

    return {
      hasActivePackage: true,
      packages: [
        {
          purchaseId: profile.packageId,
          packageId: profile.packageId,
          packageName: pkg.name,
          tier: tierFromPackage(pkg),
          purchasedAt: joined,
          status: 'active',
          practicalTotal,
          practicalUsed,
          practicalRemaining: Math.max(0, practicalTotal - practicalUsed),
          theoryTotal,
          theoryUsed,
          theoryRemaining: Math.max(0, theoryTotal - theoryUsed),
          theoryIncluded: theoryTotal > 0,
          theoryConsumed: theoryTotal > 0 && theoryUsed >= theoryTotal,
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
   * Reuses an existing active order for the same package instead of creating duplicates.
   */
  private static async applyPackageAssignment(
    userId: number,
    packageId: number,
    orderStatus: 'active' | 'paid' = 'active',
    transaction?: Transaction,
  ): Promise<{ branchId: number; packageOrderId: number; createdNewOrder: boolean } | null> {
    const user = await User.findByPk(userId, { transaction });
    if (!user || user.accountType !== 'student') return null;
    const pkg = await Package.findByPk(packageId, { transaction });
    if (!pkg) return null;
    const theoryTotal = theoryTotalFromPackage(pkg);

    const existingSamePackage = await PackageOrder.findOne({
      where: {
        studentUserId: userId,
        packageId: pkg.id,
        status: { [Op.in]: ['active', 'paid', 'confirmed'] },
      },
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      transaction,
    });
    if (existingSamePackage) {
      if (orderStatus === 'paid' && existingSamePackage.status !== 'paid') {
        await existingSamePackage.update(
          { status: 'paid', paidAt: existingSamePackage.paidAt ?? new Date() },
          { transaction },
        );
      }
      const profile = await StudentProfile.findOne({ where: { userId }, transaction });
      if (profile) {
        await profile.update(
          {
            packageId: pkg.id,
            lessonsTotal: Number(pkg.lessons ?? 0),
            theoryLessonsTotal: theoryTotal,
            enrollmentStatus: 'active',
          },
          { transaction },
        );
        await this.syncProfileCountersFromOrderBalances(userId, existingSamePackage.id, transaction);
        return { branchId: profile.branchId, packageOrderId: existingSamePackage.id, createdNewOrder: false };
      }
      const branch = await Branch.findOne({ order: [['id', 'ASC']], transaction });
      if (!branch) return null;
      return { branchId: branch.id, packageOrderId: existingSamePackage.id, createdNewOrder: false };
    }

    // Switching packages: leave prior orders intact but point profile at the new package.
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
    const balanceRows: Array<{
      packageOrderId: number;
      studentUserId: number;
      packageId: number;
      lessonType: 'practical' | 'theory';
      totalIncluded: number;
      bookedCount: number;
    }> = [
      {
        packageOrderId: order.id,
        studentUserId: userId,
        packageId: pkg.id,
        lessonType: 'practical',
        totalIncluded: Number(pkg.lessons ?? 0),
        bookedCount: 0,
      },
    ];
    if (theoryTotal > 0) {
      balanceRows.push({
        packageOrderId: order.id,
        studentUserId: userId,
        packageId: pkg.id,
        lessonType: 'theory',
        totalIncluded: theoryTotal,
        bookedCount: 0,
      });
    }
    await PackageLessonBalance.bulkCreate(balanceRows, { transaction });
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
      return { branchId: branch.id, packageOrderId: order.id, createdNewOrder: true };
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
    return { branchId: profile.branchId, packageOrderId: order.id, createdNewOrder: true };
  }

  /** Keep student_profiles lesson counters aligned with package_lesson_balances for an order. */
  static async syncProfileCountersFromOrderBalances(
    userId: number,
    packageOrderId: number,
    transaction?: Transaction,
  ): Promise<void> {
    const rows = await PackageLessonBalance.findAll({
      where: { packageOrderId, studentUserId: userId },
      transaction,
    });
    if (rows.length === 0) return;
    const byType = new Map(rows.map((r) => [r.lessonType, r] as const));
    const practical = byType.get('practical');
    const theory = theoryBalanceFromRows(rows);
    const profile = await StudentProfile.findOne({ where: { userId }, transaction });
    if (!profile) return;
    await profile.update(
      {
        ...(practical
          ? {
              lessonsTotal: Number(practical.totalIncluded ?? 0),
              lessonsCompleted: Number(practical.bookedCount ?? 0),
            }
          : {}),
        theoryLessonsTotal: theory.total,
        theoryLessonsCompleted: theory.used,
      },
      { transaction },
    );
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
      const providerRef =
        options?.providerRef?.trim() || `package-vpos:${userId}:${packageId}:${Date.now()}`;

      const existingFinance = await FinanceTransaction.findOne({
        where: { providerRef, status: 'completed' },
        transaction,
      });
      if (existingFinance) return;

      const existingPaidOrder = await PackageOrder.findOne({
        where: {
          studentUserId: userId,
          packageId,
          status: { [Op.in]: ['paid', 'confirmed'] },
          source: 'student_checkout',
        },
        transaction,
      });
      if (existingPaidOrder) return;

      const applied = await this.applyPackageAssignment(userId, packageId, 'paid', transaction);
      if (!applied) {
        throw new InputValidationError('Could not enroll in package.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      await FinanceService.create({
        customer: user.name.trim() || 'Student',
        email: user.email ?? '',
        description: `Driving package: ${pkg.name} — vPOS`,
        branchId: applied.branchId,
        channel: 'online',
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
        Number(pkg.theoryLessons ?? 0) > 0
          ? Number(pkg.theoryLessons)
          : profile && Number(profile.theoryLessonsTotal ?? 0) > 0
            ? Number(profile.theoryLessonsTotal)
            : 0;
      const practicalTotal =
        profile && Number(profile.lessonsTotal ?? 0) > 0 ? Number(profile.lessonsTotal) : Number(pkg.lessons ?? 0);
      const practicalBooked = profile ? Math.max(0, Number(profile.lessonsCompleted ?? 0)) : 0;
      const theoryBooked =
        theoryTotal > 0 && profile ? Math.min(theoryTotal, Math.max(0, Number(profile.theoryLessonsCompleted ?? 0))) : 0;

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
      const balanceRows: Array<{
        packageOrderId: number;
        studentUserId: number;
        packageId: number;
        lessonType: 'practical' | 'theory';
        totalIncluded: number;
        bookedCount: number;
      }> = [
        {
          packageOrderId: order.id,
          studentUserId: userId,
          packageId: pkg.id,
          lessonType: 'practical',
          totalIncluded: Math.max(0, practicalTotal),
          bookedCount: practicalBooked,
        },
      ];
      if (theoryTotal > 0) {
        balanceRows.push({
          packageOrderId: order.id,
          studentUserId: userId,
          packageId: pkg.id,
          lessonType: 'theory',
          totalIncluded: Math.max(0, theoryTotal),
          bookedCount: theoryBooked,
        });
      }
      await PackageLessonBalance.bulkCreate(balanceRows, { transaction: tx });
      await this.syncProfileCountersFromOrderBalances(userId, order.id, tx);
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
      const providerRef =
        options?.providerRef?.trim() || `extra-vpos:${userId}:${Date.now()}`;

      const existingFinance = await FinanceTransaction.findOne({
        where: { providerRef, status: 'completed' },
        transaction,
      });
      if (existingFinance) return;

      const purchasedAt = new Date().toISOString().slice(0, 10);
      await StudentExtraPractical.create(
        {
          userId,
          practicalTotal,
          practicalUsed: 0,
          purchasedAt,
        },
        { transaction },
      );

      const gross = parseAmdFromPriceDisplay('12,000 ֏');
      await FinanceService.create({
        customer: user.name.trim() || 'Student',
        email: user.email ?? '',
        description: `Extra practical lessons (${practicalTotal}) — vPOS`,
        branchId: profile.branchId,
        channel: 'online',
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
