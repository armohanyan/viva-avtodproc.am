import type { Transaction } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { Branch, Package, StudentExtraPractical, StudentProfile, User } from '../models';
import FinanceService from './finance.service';
import { parseAmdFromPriceDisplay } from '../utils/price-display.util';
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
    tier: PackageTierId;
    purchasedAt: string;
    practicalTotal: number;
    practicalUsed: number;
    theoryTotal: number;
    theoryUsed: number;
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
          tier: tierFromPackage(pkg),
          purchasedAt: joined,
          practicalTotal: profile.lessonsTotal,
          practicalUsed: profile.lessonsCompleted,
          theoryTotal,
          theoryUsed,
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
    transaction?: Transaction,
  ): Promise<{ branchId: number } | null> {
    const user = await User.findByPk(userId, { transaction });
    if (!user || user.accountType !== 'student') return null;
    const pkg = await Package.findByPk(packageId, { transaction });
    if (!pkg) return null;
    const theoryTotal =
      Number(pkg.theoryLessons ?? 0) > 0 ? Number(pkg.theoryLessons) : legacyTheorySessionsFromPackageName(pkg);
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

  /** Simulated online checkout: records POS-style payment then enrolls the student in the package. */
  static async purchasePackageAfterOnlinePayment(userId: number, packageId: number): Promise<StudentEntitlementsDto | null> {
    const user = await User.findByPk(userId);
    if (!user || user.accountType !== 'student') return null;
    const pkg = await Package.findByPk(packageId);
    if (!pkg) return null;
    const gross = parseAmdFromPriceDisplay(pkg.priceDisplay);
    if (gross <= 0) {
      throw new InputValidationError(
        'This package does not have a valid price for online payment.',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }

    await sequelize.transaction(async (transaction) => {
      const applied = await this.applyPackageAssignment(userId, packageId, transaction);
      if (!applied) {
        throw new InputValidationError('Could not enroll in package.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      await FinanceService.create({
        customer: user.name.trim() || 'Student',
        email: user.email ?? '',
        description: `Driving package: ${pkg.name}`,
        branchId: applied.branchId,
        channel: 'online',
        method: 'card',
        grossAmd: gross,
        feeAmd: 0,
        status: 'completed',
        providerRef: `package-pos:${userId}:${packageId}:${Date.now()}`,
        source: 'system',
        bookingId: null,
        transaction,
      });
    });

    return this.get(userId);
  }

  static async assignPackage(userId: number, packageId: number): Promise<StudentEntitlementsDto | null> {
    const applied = await sequelize.transaction(async (transaction) =>
      this.applyPackageAssignment(userId, packageId, transaction),
    );
    if (!applied) return null;
    return this.get(userId);
  }

  static async addExtraPractical(userId: number, practicalTotal = 3): Promise<StudentEntitlementsDto | null> {
    const user = await User.findByPk(userId);
    if (!user || user.accountType !== 'student') return null;
    const profile = await StudentProfile.findOne({ where: { userId } });
    if (!profile) return null;
    const purchasedAt = new Date().toISOString().slice(0, 10);
    await StudentExtraPractical.create({
      userId,
      practicalTotal,
      practicalUsed: 0,
      purchasedAt,
    });
    return this.get(userId);
  }
}

function dateIso(v: unknown): string {
  if (typeof v === 'string') return v.slice(0, 10);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}
