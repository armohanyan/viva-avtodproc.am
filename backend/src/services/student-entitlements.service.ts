import { Branch, Package, StudentExtraPractical, StudentProfile, User } from '../models';

const THEORY_BY_PACKAGE_ID: Record<string, number> = {
  PKG001: 8,
  PKG002: 12,
  PKG003: 16,
  PKG004: 6,
};

function normalizePkgKey(id: string): string {
  return id.replace(/-/g, '');
}

function theorySessionsForPackage(pkg: Package): number {
  const k = normalizePkgKey(pkg.id);
  if (THEORY_BY_PACKAGE_ID[k] != null) return THEORY_BY_PACKAGE_ID[k]!;
  const name = pkg.name.toLowerCase();
  if (name.includes('premium')) return 16;
  if (name.includes('standard')) return 12;
  if (name.includes('basic') || name.includes('refresher')) return 8;
  return 10;
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
    purchaseId: string;
    tier: PackageTierId;
    purchasedAt: string;
    practicalTotal: number;
    practicalUsed: number;
    theorySessions: number;
  }>;
  extras: Array<{
    id: string;
    purchasedAt: string;
    practicalTotal: number;
    practicalUsed: number;
    priceDisplay: string;
  }>;
};

export default class StudentEntitlementsService {
  static async get(userId: string): Promise<StudentEntitlementsDto | null> {
    const user = await User.findByPk(userId);
    if (!user || user.accountType !== 'student') return null;
    const profile = await StudentProfile.findByPk(userId);
    if (!profile) {
      return { packages: [], extras: await this.listExtras(userId) };
    }
    const pkg = await Package.findByPk(profile.packageId);
    if (!pkg) {
      return { packages: [], extras: await this.listExtras(userId) };
    }
    const joined = typeof profile.joinedAt === 'string' ? profile.joinedAt.slice(0, 10) : String(profile.joinedAt).slice(0, 10);
    return {
      packages: [
        {
          purchaseId: profile.packageId,
          tier: tierFromPackage(pkg),
          purchasedAt: joined,
          practicalTotal: profile.lessonsTotal,
          practicalUsed: profile.lessonsCompleted,
          theorySessions: theorySessionsForPackage(pkg),
        },
      ],
      extras: await this.listExtras(userId),
    };
  }

  private static async listExtras(userId: string): Promise<StudentEntitlementsDto['extras']> {
    const rows = await StudentExtraPractical.findAll({ where: { userId }, order: [['purchasedAt', 'DESC']] });
    return rows.map((r) => ({
      id: r.id,
      purchasedAt: dateIso(r.purchasedAt),
      practicalTotal: r.practicalTotal,
      practicalUsed: r.practicalUsed,
      priceDisplay: '12,000 ֏',
    }));
  }

  static async assignPackage(userId: string, packageId: string): Promise<StudentEntitlementsDto | null> {
    const user = await User.findByPk(userId);
    if (!user || user.accountType !== 'student') return null;
    const pkg = await Package.findByPk(packageId);
    if (!pkg) return null;
    let profile = await StudentProfile.findByPk(userId);
    if (!profile) {
      const branch = await Branch.findOne({ order: [['id', 'ASC']] });
      if (!branch) return null;
      await StudentProfile.create({
        userId,
        branchId: branch.id,
        packageId: pkg.id,
        instructorUserId: null,
        lessonsCompleted: 0,
        lessonsTotal: pkg.lessons,
        enrollmentStatus: 'active',
        skillRating: 0,
        licenseAchieved: false,
        joinedAt: new Date().toISOString().slice(0, 10),
      });
    } else {
      await profile.update({
        packageId: pkg.id,
        lessonsTotal: pkg.lessons,
        lessonsCompleted: 0,
        enrollmentStatus: 'active',
      });
    }
    return this.get(userId);
  }

  static async addExtraPractical(userId: string, practicalTotal = 3): Promise<StudentEntitlementsDto | null> {
    const user = await User.findByPk(userId);
    if (!user || user.accountType !== 'student') return null;
    const profile = await StudentProfile.findByPk(userId);
    if (!profile) return null;
    const id = `PL-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const purchasedAt = new Date().toISOString().slice(0, 10);
    await StudentExtraPractical.create({
      id,
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
