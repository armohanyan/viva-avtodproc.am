import { InstructorBranch, InstructorProfile, User } from '../models';

type ProfileWithUser = InstructorProfile & { user: User };

export type InstructorDto = {
  id: string;
  name: string;
  email: string;
  phone: string;
  years: number;
  rating: number;
  hourlyPrice: number;
  status: 'active' | 'inactive';
  schedule: string;
  location: string;
  car: string;
  transmission: string;
  imageSrc: string;
  availableBranchIds: string[];
  teachesPractical: boolean;
  teachesTheory: boolean;
};

function toDto(user: User, profile: InstructorProfile, branchIds: string[]): InstructorDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? '',
    years: profile.years,
    rating: profile.rating,
    hourlyPrice: profile.hourlyPrice,
    status: profile.status,
    schedule: profile.schedule,
    location: profile.location,
    car: profile.carLabel,
    transmission: profile.transmission,
    imageSrc: profile.imageSrc,
    availableBranchIds: branchIds,
    teachesPractical: profile.teachesPractical,
    teachesTheory: profile.teachesTheory,
  };
}

export default class InstructorService {
  static async list(): Promise<InstructorDto[]> {
    const profiles = await InstructorProfile.findAll({
      include: [{ model: User, as: 'user', required: true }],
    });
    const links = await InstructorBranch.findAll();
    const byInstructor = new Map<string, string[]>();
    for (const l of links) {
      const list = byInstructor.get(l.instructorUserId) ?? [];
      list.push(l.branchId);
      byInstructor.set(l.instructorUserId, list);
    }
    return profiles
      .map((p) => {
        const u = (p as ProfileWithUser).user;
        if (!u) return null;
        return toDto(u, p, byInstructor.get(p.userId) ?? []);
      })
      .filter((row): row is InstructorDto => row != null);
  }

  static async create(input: Omit<InstructorDto, 'id'> & { id?: string }): Promise<InstructorDto> {
    const id =
      input.id?.trim() ||
      `INS-${String((await InstructorProfile.count()) + 1).padStart(3, '0')}`;
    await User.create({
      id,
      email: input.email.trim().toLowerCase(),
      name: input.name,
      phone: input.phone || null,
      accountType: 'instructor',
      passwordHash: null,
    });
    await InstructorProfile.create({
      userId: id,
      years: input.years,
      rating: input.rating,
      hourlyPrice: input.hourlyPrice,
      schedule: input.schedule,
      location: input.location,
      carLabel: input.car,
      transmission: input.transmission,
      imageSrc: input.imageSrc,
      teachesPractical: input.teachesPractical,
      teachesTheory: input.teachesTheory,
      status: input.status,
    });
    await InstructorBranch.destroy({ where: { instructorUserId: id } });
    for (const branchId of input.availableBranchIds) {
      await InstructorBranch.create({ instructorUserId: id, branchId });
    }
    return (await this.getById(id))!;
  }

  static async update(id: string, patch: Partial<Omit<InstructorDto, 'id' | 'availableBranchIds'>> & { availableBranchIds?: string[] }): Promise<InstructorDto | null> {
    const user = await User.findByPk(id);
    const profile = await InstructorProfile.findByPk(id);
    if (!user || !profile) return null;

    await user.update({
      ...(patch.email !== undefined ? { email: patch.email.trim().toLowerCase() } : {}),
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone || null } : {}),
    });
    await profile.update({
      ...(patch.years !== undefined ? { years: patch.years } : {}),
      ...(patch.rating !== undefined ? { rating: patch.rating } : {}),
      ...(patch.hourlyPrice !== undefined ? { hourlyPrice: patch.hourlyPrice } : {}),
      ...(patch.schedule !== undefined ? { schedule: patch.schedule } : {}),
      ...(patch.location !== undefined ? { location: patch.location } : {}),
      ...(patch.car !== undefined ? { carLabel: patch.car } : {}),
      ...(patch.transmission !== undefined ? { transmission: patch.transmission } : {}),
      ...(patch.imageSrc !== undefined ? { imageSrc: patch.imageSrc } : {}),
      ...(patch.teachesPractical !== undefined ? { teachesPractical: patch.teachesPractical } : {}),
      ...(patch.teachesTheory !== undefined ? { teachesTheory: patch.teachesTheory } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
    });
    if (patch.availableBranchIds) {
      await InstructorBranch.destroy({ where: { instructorUserId: id } });
      for (const branchId of patch.availableBranchIds) {
        await InstructorBranch.create({ instructorUserId: id, branchId });
      }
    }
    return this.getById(id);
  }

  static async getById(id: string): Promise<InstructorDto | null> {
    const profile = await InstructorProfile.findByPk(id, {
      include: [{ model: User, as: 'user', required: true }],
    });
    if (!profile) return null;
    const links = await InstructorBranch.findAll({ where: { instructorUserId: id } });
    const u = (profile as ProfileWithUser).user;
    if (!u) return null;
    return toDto(
      u,
      profile,
      links.map((l) => l.branchId),
    );
  }

  static async remove(id: string): Promise<boolean> {
    await InstructorBranch.destroy({ where: { instructorUserId: id } });
    const p = await InstructorProfile.destroy({ where: { userId: id } });
    const u = await User.destroy({ where: { id } });
    return p > 0 && u > 0;
  }
}
